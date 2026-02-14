import { queryFirst, query } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { nanoid } from "nanoid";
import type { Order, OrderItem } from "@/lib/db/types";
export type { Order, OrderItem };

interface CreateOrderData {
  userId: string;
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  promoCodeId: string | null;
  deliveryAddress: string;
  deliveryCommune: string;
  deliveryPhone: string;
  deliveryInstructions: string | null;
  estimatedDelivery: string | null;
}

interface CreateOrderItemData {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export async function createOrderWithItems(
  orderData: CreateOrderData,
  items: CreateOrderItemData[]
): Promise<{ orderId: string; orderNumber: string }> {
  const db = await getDB();
  const orderId = nanoid();

  const statements: D1PreparedStatement[] = [];
  const stockUpdateIndices: number[] = [];

  // 1. Stock decrements FIRST — if these fail, no order row is orphaned
  for (const item of items) {
    if (item.variantId) {
      stockUpdateIndices.push(statements.length);
      statements.push(
        db
          .prepare(
            "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?"
          )
          .bind(item.quantity, item.variantId, item.quantity)
      );
    } else {
      stockUpdateIndices.push(statements.length);
      statements.push(
        db
          .prepare(
            "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?"
          )
          .bind(item.quantity, item.productId, item.quantity)
      );
    }
  }

  // 2. Insert order
  statements.push(
    db
      .prepare(
        `INSERT INTO orders (id, user_id, order_number, subtotal, delivery_fee, discount_amount, total, promo_code_id, delivery_address, delivery_commune, delivery_phone, delivery_instructions, estimated_delivery)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId,
        orderData.userId,
        orderData.orderNumber,
        orderData.subtotal,
        orderData.deliveryFee,
        orderData.discountAmount,
        orderData.total,
        orderData.promoCodeId,
        orderData.deliveryAddress,
        orderData.deliveryCommune,
        orderData.deliveryPhone,
        orderData.deliveryInstructions,
        orderData.estimatedDelivery
      )
  );

  // 3. Insert order items
  for (const item of items) {
    const itemId = nanoid();
    statements.push(
      db
        .prepare(
          `INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          itemId,
          orderId,
          item.productId,
          item.variantId,
          item.productName,
          item.variantName,
          item.quantity,
          item.unitPrice,
          item.totalPrice
        )
    );
  }

  // 4. Increment promo code used_count
  if (orderData.promoCodeId) {
    statements.push(
      db
        .prepare(
          "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?"
        )
        .bind(orderData.promoCodeId)
    );
  }

  const results = await db.batch(statements);

  // 5. Verify all stock decrements succeeded
  for (let i = 0; i < stockUpdateIndices.length; i++) {
    const result = results[stockUpdateIndices[i]];
    if (result.meta.changes === 0) {
      // Stock was insufficient — delete the orphaned order + items
      await db.batch([
        db.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId),
        db.prepare("DELETE FROM orders WHERE id = ?").bind(orderId),
        // Restore stock for items that DID succeed (before this one)
        ...items.slice(0, i).map((prev) => {
          if (prev.variantId) {
            return db
              .prepare(
                "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?"
              )
              .bind(prev.quantity, prev.variantId);
          }
          return db
            .prepare(
              "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?"
            )
            .bind(prev.quantity, prev.productId);
        }),
        // Restore promo used_count if it was incremented
        ...(orderData.promoCodeId
          ? [
              db
                .prepare(
                  "UPDATE promo_codes SET used_count = used_count - 1 WHERE id = ?"
                )
                .bind(orderData.promoCodeId),
            ]
          : []),
      ]);
      throw new Error(
        `Stock insuffisant pour ${items[i].productName} (mise a jour concurrente)`
      );
    }
  }

  return { orderId, orderNumber: orderData.orderNumber };
}

export async function getOrderByNumber(
  orderNumber: string,
  userId: string
): Promise<Order | null> {
  return queryFirst<Order>(
    "SELECT * FROM orders WHERE order_number = ? AND user_id = ?",
    [orderNumber, userId]
  );
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  return query<OrderItem>(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );
}

export async function getUserOrders(
  userId: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ orders: Order[]; total: number }> {
  const { limit = 10, offset = 0, status } = opts;

  const where = status
    ? "WHERE user_id = ? AND status = ?"
    : "WHERE user_id = ?";
  const params = status ? [userId, status] : [userId];

  const countRow = await queryFirst<{ total: number }>(
    `SELECT COUNT(*) as total FROM orders ${where}`,
    params
  );

  const orders = await query<Order>(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { orders, total: countRow?.total ?? 0 };
}

export async function getOrderDetail(
  orderNumber: string,
  userId: string
): Promise<{ order: Order; items: OrderItem[] } | null> {
  const order = await getOrderByNumber(orderNumber, userId);
  if (!order) return null;
  const items = await getOrderItems(order.id);
  return { order, items };
}

export async function cancelOrder(
  orderNumber: string,
  userId: string,
  reason: string
): Promise<boolean> {
  const db = await getDB();
  const result = await db
    .prepare(
      `UPDATE orders SET status = 'cancelled', cancelled_at = datetime('now'), cancellation_reason = ?, updated_at = datetime('now')
       WHERE order_number = ? AND user_id = ? AND status = 'pending'`
    )
    .bind(reason, orderNumber, userId)
    .run();
  return result.meta.changes > 0;
}

/**
 * Refunds stock for a cancelled or returned order.
 * Restores product/variant stock quantities based on order items.
 * @throws Error if order has no items or if stock update fails
 */
export async function refundOrderStock(orderId: string): Promise<{ itemsRefunded: number }> {
  const db = await getDB();
  const items = await query<OrderItem>(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );

  if (items.length === 0) {
    // Log warning but don't throw - order might have been manually cleaned
    console.warn(`refundOrderStock: No items found for order ${orderId}`);
    return { itemsRefunded: 0 };
  }

  const statements: D1PreparedStatement[] = [];

  for (const item of items) {
    if (item.variant_id) {
      statements.push(
        db
          .prepare(
            "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?"
          )
          .bind(item.quantity, item.variant_id)
      );
    } else {
      statements.push(
        db
          .prepare(
            "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?"
          )
          .bind(item.quantity, item.product_id)
      );
    }
  }

  try {
    const results = await db.batch(statements);

    // Verify all updates succeeded
    const failedUpdates = results.filter((r) => r.meta.changes === 0);
    if (failedUpdates.length > 0) {
      console.warn(
        `refundOrderStock: ${failedUpdates.length}/${items.length} items had no matching product/variant for order ${orderId}`
      );
    }

    return { itemsRefunded: items.length - failedUpdates.length };
  } catch (error) {
    console.error(`refundOrderStock: Failed to refund stock for order ${orderId}`, error);
    throw new Error(`Échec du remboursement du stock pour la commande ${orderId}`);
  }
}
