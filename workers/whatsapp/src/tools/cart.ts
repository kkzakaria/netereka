import type { ToolContext, ToolResult } from "../types";
// Same shared pricing rule as the web checkout and as createOrder — see
// lib/utils/checkout.ts. Pure module, nothing lands in the Worker bundle.
import { resolveOrderLine } from "../../../../lib/utils/checkout";

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
  variant_name: string | null;
  quantity: number;
  unit_price: number;
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
  const { results } = await ctx.db
    .prepare(
      `SELECT wc.id, p.name as product_name, pv.name as variant_name,
              wc.quantity,
              COALESCE(pv.price, p.base_price) as unit_price
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       LEFT JOIN product_variants pv ON wc.variant_id = pv.id
       WHERE wc.session_id = ?
       ORDER BY wc.created_at`
    )
    .bind(ctx.session.id)
    .all<CartViewRow>();

  const items = results.map((row) => ({
    id: row.id,
    name: row.variant_name ? `${row.product_name} – ${row.variant_name}` : row.product_name,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total: row.quantity * row.unit_price,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return { success: true, data: { items, subtotal } };
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
