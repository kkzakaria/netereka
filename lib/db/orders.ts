import { queryFirst, query } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { nanoid } from "nanoid";
import type { Order, OrderItem } from "@/lib/db/types";

export async function generateOrderNumber(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let attempt = 0; attempt < 5; attempt++) {
    let result = "ORD-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await queryFirst<{ id: string }>(
      "SELECT id FROM orders WHERE order_number = ? LIMIT 1",
      [result]
    );
    if (!existing) return result;
  }
  throw new Error("Impossible de generer un numero de commande unique");
}

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

  // Insert order
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

  // Insert order items + decrement stock
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

    // Decrement stock on variant or product (guard against negative)
    if (item.variantId) {
      statements.push(
        db
          .prepare(
            "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?"
          )
          .bind(item.quantity, item.variantId, item.quantity)
      );
    } else {
      statements.push(
        db
          .prepare(
            "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?"
          )
          .bind(item.quantity, item.productId, item.quantity)
      );
    }
  }

  // Increment promo code used_count
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

  // Verify stock decrements succeeded (statements after order insert + item inserts)
  // Layout: 1 order insert + N * (1 item insert + 1 stock update) + optional promo update
  for (let i = 0; i < items.length; i++) {
    const stockUpdateIndex = 1 + i * 2 + 1; // offset past order insert, then pairs of (insert, update)
    const stockResult = results[stockUpdateIndex];
    if (stockResult.meta.changes === 0) {
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
