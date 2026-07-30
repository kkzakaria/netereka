import type { ToolContext, ToolResult } from "../types";
// Same shared pricing rule as the web checkout and as createOrder — see
// lib/utils/checkout.ts. Pure module, nothing lands in the Worker bundle.
import { resolveOrderLine } from "../../../../lib/utils/checkout";
import {
  isProductInCatalogue,
  productGoneFromCatalogue,
  variantGoneFromCatalogue,
} from "./line-issues";

interface ProductRow {
  id: string;
  name: string;
  base_price: number;
  stock_quantity: number;
  /** Number of is_active = 1 variants this product has. */
  active_variant_count: number;
}

interface VariantRow {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface CartItemRow {
  id: string;
  quantity: number;
}

interface CartViewRow {
  id: string;
  product_name: string;
  base_price: number;
  product_stock: number;
  product_is_active: number;
  product_is_draft: number;
  active_variant_count: number;
  /** What the cart row points at, whether or not it still resolves. */
  cart_variant_id: string | null;
  /** Set only when that variant is still active and owned by the product. */
  variant_id: string | null;
  variant_name: string | null;
  variant_price: number | null;
  variant_stock: number | null;
  quantity: number;
}

interface CartViewItem {
  id: string;
  name: string;
  quantity: number;
  /** null when no honest price exists for this line. */
  unit_price: number | null;
  total: number | null;
  /** French explanation when the line cannot be ordered as it stands. */
  issue: string | null;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function cartAdd(
  ctx: ToolContext,
  params: { product_id: string; variant_id?: string; quantity?: number }
): Promise<ToolResult & { data?: unknown }> {
  const quantity = params.quantity ?? 1;

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "La quantité doit être un entier positif." };
  }

  // Validate product exists and is available. The active-variant count comes
  // along so a product sold through variants can never be priced from its
  // base_price (a display figure, not a sellable price).
  const product = await ctx.db
    .prepare(
      `SELECT p.id, p.name, p.base_price, p.stock_quantity,
              (SELECT COUNT(*) FROM product_variants v
                WHERE v.product_id = p.id AND v.is_active = 1) as active_variant_count
       FROM products p
       WHERE p.id = ? AND p.is_active = 1 AND p.is_draft = 0`
    )
    .bind(params.product_id)
    .first<ProductRow>();

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  // If variant provided, validate it belongs to this product and is active
  let variant: VariantRow | null = null;
  if (params.variant_id) {
    variant = await ctx.db
      .prepare(
        `SELECT id, name, price, stock_quantity
         FROM product_variants
         WHERE id = ? AND product_id = ? AND is_active = 1`
      )
      .bind(params.variant_id, params.product_id)
      .first<VariantRow>();

    if (!variant) {
      return { success: false, error: "Variant not found or does not belong to this product" };
    }
  }

  // Price + stock decided by the shared rule. Refusing here rather than only at
  // checkout keeps an unsellable base_price from ever being quoted back in the
  // conversation; createOrder re-checks anyway, since a variant can be retired
  // between the add and the order.
  const resolved = resolveOrderLine({
    product: {
      name: product.name,
      base_price: product.base_price,
      stock_quantity: product.stock_quantity,
      activeVariantCount: product.active_variant_count ?? 0,
    },
    variant: variant
      ? { name: variant.name, price: variant.price, stock_quantity: variant.stock_quantity }
      : null,
    quantity,
  });

  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }

  const itemName = variant ? `${product.name} – ${variant.name}` : product.name;
  const unitPrice = resolved.unitPrice;
  const availableStock = resolved.availableStock;

  // Check if item already in cart (same product + variant combination)
  const existing = await ctx.db
    .prepare(
      `SELECT id, quantity FROM whatsapp_carts
       WHERE session_id = ? AND product_id = ? AND (variant_id IS ? OR variant_id = ?)`
    )
    .bind(
      ctx.session.id,
      params.product_id,
      params.variant_id ?? null,
      params.variant_id ?? null
    )
    .first<CartItemRow>();

  if (existing) {
    // Update existing item quantity — check cumulative stock
    const newQuantity = existing.quantity + quantity;
    if (newQuantity > availableStock) {
      return {
        success: false,
        error: `Stock insuffisant pour ${itemName}. Vous avez déjà ${existing.quantity} unité(s) dans le panier, seulement ${availableStock} disponible(s).`,
      };
    }
    await ctx.db
      .prepare(
        `UPDATE whatsapp_carts
         SET quantity = ?, updated_at = datetime('now')
         WHERE id = ? AND session_id = ?`
      )
      .bind(newQuantity, existing.id, ctx.session.id)
      .run();
  } else {
    // Insert new cart item
    await ctx.db
      .prepare(
        `INSERT INTO whatsapp_carts (id, session_id, product_id, variant_id, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        generateId(),
        ctx.session.id,
        params.product_id,
        params.variant_id ?? null,
        quantity
      )
      .run();
  }

  return {
    success: true,
    data: { name: itemName, price: unitPrice, quantity },
  };
}

export async function cartView(
  ctx: ToolContext
): Promise<ToolResult & { data?: unknown }> {
  // The view answers the same question the order path does, with the same
  // rule. Quoting a figure the checkout will then refuse is what makes the
  // channel look untrustworthy, so a line that cannot be priced honestly
  // carries `unit_price: null` and a reason instead of an invented number.
  const { results } = await ctx.db
    .prepare(
      `SELECT wc.id, wc.quantity, wc.variant_id as cart_variant_id,
              p.name as product_name, p.base_price,
              p.stock_quantity as product_stock,
              p.is_active as product_is_active, p.is_draft as product_is_draft,
              (SELECT COUNT(*) FROM product_variants v
                WHERE v.product_id = p.id AND v.is_active = 1) as active_variant_count,
              pv.id as variant_id, pv.name as variant_name,
              pv.price as variant_price, pv.stock_quantity as variant_stock
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       LEFT JOIN product_variants pv
              ON pv.id = wc.variant_id AND pv.product_id = wc.product_id AND pv.is_active = 1
       WHERE wc.session_id = ?
       ORDER BY wc.created_at`
    )
    .bind(ctx.session.id)
    .all<CartViewRow>();

  const items: CartViewItem[] = (results ?? []).map((row) => {
    const name = row.variant_name
      ? `${row.product_name} – ${row.variant_name}`
      : row.product_name;
    const base = { id: row.id, name, quantity: row.quantity };

    if (!isProductInCatalogue(row)) {
      return { ...base, unit_price: null, total: null, issue: productGoneFromCatalogue(row.product_name) };
    }

    // The row points at a variant that no longer resolves (retired, or moved
    // to another product). Falling back to base_price here is exactly the
    // invented figure we are avoiding.
    if (row.cart_variant_id && !row.variant_id) {
      return { ...base, unit_price: null, total: null, issue: variantGoneFromCatalogue(row.product_name) };
    }

    const lineInput = {
      product: {
        name: row.product_name,
        base_price: row.base_price,
        stock_quantity: row.product_stock,
        activeVariantCount: row.active_variant_count ?? 0,
      },
      variant:
        row.variant_id !== null
          ? {
              name: row.variant_name ?? "",
              price: row.variant_price ?? 0,
              stock_quantity: row.variant_stock ?? 0,
            }
          : null,
    };

    const line = resolveOrderLine({ ...lineInput, quantity: row.quantity });
    if (line.ok) {
      return { ...base, unit_price: line.unitPrice, total: line.unitPrice * row.quantity, issue: null };
    }

    // Refused. A line that is merely short on stock still has an honest price
    // and the customer can act on it by lowering the quantity, so keep the
    // figure. Asking with quantity 0 makes the stock comparisons unreachable,
    // which isolates the pricing question without restating the pricing rule.
    const priceOnly = resolveOrderLine({ ...lineInput, quantity: 0 });
    return {
      ...base,
      unit_price: priceOnly.ok ? priceOnly.unitPrice : null,
      total: priceOnly.ok ? priceOnly.unitPrice * row.quantity : null,
      issue: line.error,
    };
  });

  // Only lines that can actually be ordered count toward the subtotal, so the
  // bot never announces a total the checkout would not honour.
  const subtotal = items.reduce((sum, item) => sum + (item.issue === null ? (item.total ?? 0) : 0), 0);
  const hasBlockingIssues = items.some((item) => item.issue !== null);

  return { success: true, data: { items, subtotal, has_blocking_issues: hasBlockingIssues } };
}

export async function cartUpdate(
  ctx: ToolContext,
  params: { item_id: string; quantity: number }
): Promise<ToolResult> {
  if (params.quantity <= 0) {
    return cartRemove(ctx, { item_id: params.item_id });
  }

  if (!Number.isInteger(params.quantity)) {
    return { success: false, error: "La quantité doit être un entier." };
  }

  // Validate stock for the new quantity
  const cartItem = await ctx.db
    .prepare(
      `SELECT wc.product_id, wc.variant_id,
              COALESCE(pv.stock_quantity, p.stock_quantity) as available_stock
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       LEFT JOIN product_variants pv ON wc.variant_id = pv.id
       WHERE wc.id = ? AND wc.session_id = ?`
    )
    .bind(params.item_id, ctx.session.id)
    .first<{ product_id: string; variant_id: string | null; available_stock: number }>();

  if (!cartItem) {
    return { success: false, error: "Article introuvable dans le panier." };
  }

  if (params.quantity > cartItem.available_stock) {
    return { success: false, error: `Stock insuffisant. Seulement ${cartItem.available_stock} unité(s) disponible(s).` };
  }

  await ctx.db
    .prepare(
      `UPDATE whatsapp_carts
       SET quantity = ?, updated_at = datetime('now')
       WHERE id = ? AND session_id = ?`
    )
    .bind(params.quantity, params.item_id, ctx.session.id)
    .run();

  return { success: true };
}

export async function cartRemove(
  ctx: ToolContext,
  params: { item_id: string }
): Promise<ToolResult> {
  await ctx.db
    .prepare(
      `DELETE FROM whatsapp_carts
       WHERE id = ? AND session_id = ?`
    )
    .bind(params.item_id, ctx.session.id)
    .run();

  return { success: true };
}

export async function cartClear(ctx: ToolContext): Promise<ToolResult> {
  await ctx.db
    .prepare(`DELETE FROM whatsapp_carts WHERE session_id = ?`)
    .bind(ctx.session.id)
    .run();

  return { success: true };
}
