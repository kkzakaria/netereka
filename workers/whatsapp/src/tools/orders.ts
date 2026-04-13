import type { ToolContext, ToolResult } from "../types";

interface CartItemRow {
  cart_item_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  stock_quantity: number;
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
  if (!ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account before placing an order.",
    };
  }

  // Fetch cart items with product/variant info and stock
  const { results: cartItems } = await ctx.db
    .prepare(
      `SELECT wc.id as cart_item_id, p.id as product_id, wc.variant_id,
              p.name as product_name, pv.name as variant_name,
              wc.quantity,
              COALESCE(pv.price, p.base_price) as unit_price,
              COALESCE(pv.stock_quantity, p.stock_quantity) as stock_quantity
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       LEFT JOIN product_variants pv ON wc.variant_id = pv.id
       WHERE wc.session_id = ?`
    )
    .bind(ctx.session.id)
    .all<CartItemRow>();

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Your cart is empty. Add items before placing an order." };
  }

  // Validate stock for each item
  for (const item of cartItems) {
    if (item.stock_quantity < item.quantity) {
      const name = item.variant_name
        ? `${item.product_name} – ${item.variant_name}`
        : item.product_name;
      return {
        success: false,
        error: `Insufficient stock for "${name}". Only ${item.stock_quantity} unit(s) available.`,
      };
    }
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
  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
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

  const insertItemStatements = cartItems.map((item) =>
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
        item.product_id,
        item.variant_id ?? null,
        item.product_name,
        item.variant_name ?? null,
        item.quantity,
        item.unit_price,
        item.quantity * item.unit_price
      )
  );

  // Decrement stock for each item
  const stockDecrements = cartItems.map((item) =>
    item.variant_id
      ? ctx.db
          .prepare("UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?")
          .bind(item.quantity, item.variant_id)
      : ctx.db
          .prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
          .bind(item.quantity, item.product_id)
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
      item_count: cartItems.length,
    },
  };
}

export async function getOrderStatus(
  ctx: ToolContext,
  params: { order_number: string }
): Promise<ToolResult & { data?: unknown }> {
  if (!ctx.session.user_id) {
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
  if (!ctx.session.user_id) {
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
