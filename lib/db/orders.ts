import { queryFirst, query } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { nanoid } from "nanoid";
import type { Order, OrderItem } from "@/lib/db/types";

export function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

    // Decrement stock on variant or product
    if (item.variantId) {
      statements.push(
        db
          .prepare(
            "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?"
          )
          .bind(item.quantity, item.variantId)
      );
    } else {
      statements.push(
        db
          .prepare(
            "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?"
          )
          .bind(item.quantity, item.productId)
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

  await db.batch(statements);

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
