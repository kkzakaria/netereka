import type { ToolContext, ToolResult } from "../types";
// Shared with the web checkout on purpose: order-line pricing has exactly one
// implementation in this repo. It is a pure module whose only import is an
// `import type`, so nothing is pulled into the Worker bundle.
import {
  resolveOrderLine,
  countActiveVariantsByProduct,
  calculateSubtotal,
} from "../../../../lib/utils/checkout";

interface CartItemRow {
  cart_item_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  base_price: number;
  product_stock: number;
  quantity: number;
}

interface ActiveVariantRow {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface ResolvedOrderLine {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
}

interface DeliveryZoneRow {
  id: string;
  fee: number;
  estimated_hours: number;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  estimated_delivery: string | null;
}

function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${result}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function createOrder(
  ctx: ToolContext,
  params: { address: string; commune: string; phone: string; instructions?: string }
): Promise<ToolResult & { data?: unknown }> {
  if (ctx.session.is_verified !== 1 || !ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account before placing an order.",
    };
  }

  // Fetch cart items with the product's own figures. Prices are NOT read from
  // this query: the unit price is decided by resolveOrderLine below, from the
  // active variant when the product has any.
  const { results: cartItems } = await ctx.db
    .prepare(
      `SELECT wc.id as cart_item_id, p.id as product_id, wc.variant_id,
              p.name as product_name, p.base_price,
              p.stock_quantity as product_stock,
              wc.quantity
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       WHERE wc.session_id = ?`
    )
    .bind(ctx.session.id)
    .all<CartItemRow>();

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Your cart is empty. Add items before placing an order." };
  }

  // Fetch every ACTIVE variant of every product in the cart — not just the ones
  // referenced by a variant_id. This yields each product's activeVariantCount
  // without a second COUNT query, and guarantees a variant can only resolve for
  // a product actually in this cart.
  const productIds = [...new Set(cartItems.map((item) => item.product_id))];
  const placeholders = productIds.map(() => "?").join(",");
  const { results: activeVariantRows } = await ctx.db
    .prepare(
      `SELECT id, product_id, name, price, stock_quantity
       FROM product_variants
       WHERE product_id IN (${placeholders}) AND is_active = 1`
    )
    .bind(...productIds)
    .all<ActiveVariantRow>();

  const activeVariants = activeVariantRows ?? [];
  const variantById = new Map(activeVariants.map((v) => [v.id, v]));
  const activeVariantCountByProduct = countActiveVariantsByProduct(activeVariants);

  // Resolve the price and stock of every line. base_price is a display figure
  // for a product sold through variants, never a sellable price — a line with
  // no variant on such a product stops the order here.
  const lines: ResolvedOrderLine[] = [];

  for (const item of cartItems) {
    let variant: ActiveVariantRow | null = null;
    if (item.variant_id) {
      const candidate = variantById.get(item.variant_id);
      if (!candidate || candidate.product_id !== item.product_id) {
        return {
          success: false,
          error: `La variante choisie pour ${item.product_name} n'est plus disponible. Veuillez en sélectionner une autre.`,
        };
      }
      variant = candidate;
    }

    const resolved = resolveOrderLine({
      product: {
        name: item.product_name,
        base_price: item.base_price,
        stock_quantity: item.product_stock,
        activeVariantCount: activeVariantCountByProduct.get(item.product_id) ?? 0,
      },
      variant: variant
        ? { name: variant.name, price: variant.price, stock_quantity: variant.stock_quantity }
        : null,
      quantity: item.quantity,
    });

    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    lines.push({
      productId: item.product_id,
      variantId: variant?.id ?? null,
      productName: item.product_name,
      variantName: variant?.name ?? null,
      unitPrice: resolved.unitPrice,
      quantity: item.quantity,
    });
  }

  // Look up delivery zone by commune
  const zone = await ctx.db
    .prepare(
      `SELECT id, fee, estimated_hours
       FROM delivery_zones
       WHERE commune = ? AND is_active = 1
       LIMIT 1`
    )
    .bind(params.commune)
    .first<DeliveryZoneRow>();

  if (!zone) {
    return {
      success: false,
      error: `No active delivery zone found for "${params.commune}". Please choose a different commune.`,
    };
  }

  // Calculate totals
  const subtotal = calculateSubtotal(lines);
  const deliveryFee = zone.fee;
  const total = subtotal + deliveryFee;

  // Generate order number and id
  const orderId = generateId();
  const orderNumber = generateOrderNumber();

  // Estimate delivery date
  const estimatedDelivery = new Date(
    Date.now() + zone.estimated_hours * 60 * 60 * 1000
  ).toISOString();

  // Build batch statements: insert order + order_items + clear cart
  const insertOrder = ctx.db
    .prepare(
      `INSERT INTO orders (
         id, user_id, order_number, status, subtotal, delivery_fee, discount_amount,
         total, channel, delivery_address, delivery_commune, delivery_phone,
         delivery_instructions, estimated_delivery, created_at, updated_at
       ) VALUES (?, ?, ?, 'pending', ?, ?, 0, ?, 'whatsapp', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      orderId,
      ctx.session.user_id,
      orderNumber,
      subtotal,
      deliveryFee,
      total,
      params.address,
      params.commune,
      params.phone,
      params.instructions ?? null,
      estimatedDelivery
    );

  const insertItemStatements = lines.map((line) =>
    ctx.db
      .prepare(
        `INSERT INTO order_items (
           id, order_id, product_id, variant_id, product_name, variant_name,
           quantity, unit_price, total_price
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        orderId,
        line.productId,
        line.variantId,
        line.productName,
        line.variantName,
        line.quantity,
        line.unitPrice,
        line.quantity * line.unitPrice
      )
  );

  // Decrement stock for each item
  const stockDecrements = lines.map((line) =>
    line.variantId
      ? ctx.db
          .prepare("UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?")
          .bind(line.quantity, line.variantId)
      : ctx.db
          .prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
          .bind(line.quantity, line.productId)
  );

  const clearCart = ctx.db
    .prepare(`DELETE FROM whatsapp_carts WHERE session_id = ?`)
    .bind(ctx.session.id);

  await ctx.db.batch([insertOrder, ...insertItemStatements, ...stockDecrements, clearCart]);

  return {
    success: true,
    data: {
      order_number: orderNumber,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      estimated_delivery: estimatedDelivery,
      item_count: lines.length,
    },
  };
}

export async function getOrderStatus(
  ctx: ToolContext,
  params: { order_number: string }
): Promise<ToolResult & { data?: unknown }> {
  if (ctx.session.is_verified !== 1 || !ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account to view orders.",
    };
  }

  const order = await ctx.db
    .prepare(
      `SELECT id, order_number, status, total, created_at, estimated_delivery
       FROM orders
       WHERE order_number = ? AND user_id = ?`
    )
    .bind(params.order_number, ctx.session.user_id)
    .first<OrderRow>();

  if (!order) {
    return {
      success: false,
      error: `Order "${params.order_number}" not found or does not belong to your account.`,
    };
  }

  return {
    success: true,
    data: {
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      estimated_delivery: order.estimated_delivery,
    },
  };
}

export async function listOrders(
  ctx: ToolContext,
  params: { limit?: number }
): Promise<ToolResult & { data?: unknown }> {
  if (ctx.session.is_verified !== 1 || !ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account to view orders.",
    };
  }

  const limit = Math.max(1, Math.min(params.limit ?? 5, 10));

  const { results } = await ctx.db
    .prepare(
      `SELECT order_number, status, total, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(ctx.session.user_id, limit)
    .all<Pick<OrderRow, "order_number" | "status" | "total" | "created_at">>();

  return {
    success: true,
    data: {
      orders: results,
      count: results.length,
    },
  };
}
