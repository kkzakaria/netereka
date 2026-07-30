import { queryFirst, query, execute } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { nanoid } from "nanoid";
import type { Order, OrderItem, OrderStatus } from "@/lib/db/types";
import { notifyOrderStatusUpdate } from "@/lib/notifications";
// One implementation of "take stock / give it back", shared with the WhatsApp
// Worker (workers/whatsapp/src/tools/orders.ts). See lib/utils/stock.ts.
import {
  buildStockDecrement,
  buildStockRestore,
  stockUpdateApplied,
} from "@/lib/utils/stock";
export type { Order, OrderItem };

/** Concurrently-open pending orders allowed per user (see createOrder). */
export const MAX_PENDING_ORDERS_PER_USER = 3;

/**
 * Pending orders older than this are reaped automatically (see
 * reapStalePendingOrders), AND are excluded from the concurrent-pending cap
 * (see countPendingOrdersForUser). Sharing one constant for both keeps the
 * cap self-releasing on its own clock: a customer who hits the cap is never
 * stuck waiting on the sweep actually running (which depends on an external
 * trigger, see app/api/cron/reap-pending-orders) — their oldest order simply
 * stops counting once it turns this old, whether or not anything has swept
 * it yet.
 */
export const REAP_STALE_AFTER_HOURS = 24;

/**
 * Max stale orders processed per reapStalePendingOrders() call. The sweep
 * has never run before this task, so the first invocation could otherwise
 * meet the entire historical backlog in one call — each order costs a
 * guarded UPDATE, an order_items SELECT, and a stock-refund batch, so an
 * unbounded loop risks the Workers subrequest ceiling or the invocation
 * duration limit on a large backlog. Chosen conservatively; the caller
 * checks `hasMore` and can invoke again to keep draining a large backlog
 * across multiple runs.
 */
export const REAP_BATCH_SIZE = 25;

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

  // 0. Reserve the order row itself, with the concurrent-pending cap embedded
  //    in the same statement as the write. This is the actual enforcement
  //    boundary for MAX_PENDING_ORDERS_PER_USER — actions/checkout.ts's own
  //    countPendingOrdersForUser check is a read-then-act fast path (cheap,
  //    good UX, skips the rest of validation for the common case) and is NOT
  //    safe against a burst of parallel createOrder calls: every one of them
  //    could read the same "under cap" count before any of them writes. This
  //    INSERT ... SELECT ... WHERE form can't be raced the same way, because
  //    the guard and the write are one atomic statement — each row that
  //    actually commits raises the COUNT the next racing statement sees, so
  //    only as many inserts as there is room for under the cap can ever
  //    match the WHERE clause, no matter how many arrive at once. Mirrors the
  //    existing guarded-UPDATE idiom this function already uses below for
  //    stock and promo-code redemption.
  const reservation = await execute(
    `INSERT INTO orders (id, user_id, order_number, subtotal, delivery_fee, discount_amount, total, promo_code_id, delivery_address, delivery_commune, delivery_phone, delivery_instructions, estimated_delivery)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'pending' AND created_at >= datetime('now', ?)) < ?`,
    [
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
      orderData.estimatedDelivery,
      orderData.userId,
      `-${REAP_STALE_AFTER_HOURS} hours`,
      MAX_PENDING_ORDERS_PER_USER,
    ]
  );

  // Fail closed: only a confirmed changes > 0 counts as "reserved". If a
  // future D1 version ever returned `undefined` for `meta.changes` instead
  // of `0`, `=== 0` would treat that as "reserved" and continue into stock
  // decrements and item inserts for a row that was never actually written —
  // `!(... > 0)` treats anything that isn't affirmatively a successful
  // write as blocked instead.
  if (!(reservation.meta.changes > 0)) {
    // Nothing was written — no stock touched, no items inserted, nothing to
    // roll back. A caller retrying immediately after will see the same
    // (accurate, not stale) count on their next attempt.
    throw new Error(
      "Vous avez deja plusieurs commandes en attente de confirmation. Merci d'attendre leur traitement avant d'en passer une nouvelle."
    );
  }

  const statements: D1PreparedStatement[] = [];
  const stockUpdateIndices: number[] = [];

  // 1. Stock decrements — the order row itself is already committed at this
  //    point (step 0's guarded reservation, above), so unlike the original
  //    layout this can no longer prevent an orphaned order row by running
  //    first; that is now the job of the try/catch around db.batch below.
  for (const item of items) {
    const { sql, params } = buildStockDecrement(item);
    stockUpdateIndices.push(statements.length);
    statements.push(db.prepare(sql).bind(...params));
  }

  // 2. Insert order items (the order row itself was already inserted and
  //    committed in step 0's guarded reservation, above)
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

  // 4. Increment promo code used_count. The WHERE guard re-checks max_uses at
  //    write time so a capped code cannot be redeemed beyond its limit under
  //    concurrency (the read-side check in validatePromoCode is not atomic with
  //    this increment). The result is verified after the batch.
  let promoUpdateIndex = -1;
  if (orderData.promoCodeId) {
    promoUpdateIndex = statements.length;
    statements.push(
      db
        .prepare(
          "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)"
        )
        .bind(orderData.promoCodeId)
    );
  }

  let results: D1Result[];
  try {
    results = await db.batch(statements);
  } catch (error) {
    // db.batch runs as one implicit transaction: if it throws (a transient
    // D1 error, a constraint failure on an item insert), NONE of the stock
    // decrements or order_items inserts committed — but the order row itself
    // was already committed by step 0's guarded reservation, *before* this
    // batch ever ran. Left alone, that would surface to the customer and to
    // admin as a `pending` order with a real order_number and total but zero
    // items, occupying one of the three concurrent-pending-cap slots for up
    // to REAP_STALE_AFTER_HOURS until the reaper cancels it. Delete the
    // reservation here so a batch failure leaves nothing behind, mirroring
    // the compensating-revert discipline cancelPendingOrderById already uses
    // for the equivalent case on the cancellation path.
    await execute("DELETE FROM orders WHERE id = ?", [orderId]);
    console.error(`createOrderWithItems: batch failed for reserved order ${orderId}, reservation deleted`, error);
    throw new Error(`Échec de la création de la commande ${orderData.orderNumber}`);
  }
  const promoApplied =
    promoUpdateIndex !== -1 && results[promoUpdateIndex].meta.changes > 0;

  // 5. Verify all stock decrements succeeded
  for (let i = 0; i < stockUpdateIndices.length; i++) {
    if (!stockUpdateApplied(results[stockUpdateIndices[i]])) {
      // Stock was insufficient — delete the orphaned order + items and give
      // back every decrement that DID apply.
      //
      // "Every", not "every one before this line": db.batch executes the whole
      // sequence, and a decrement matching no row is not a failure that stops
      // it — the statements after the refused one still ran and still
      // reserved. Restoring only `items.slice(0, i)` left those later
      // reservations held against an order this very batch is deleting, with
      // nothing left to release them. Conversely, a decrement that did NOT
      // apply must never be restored: that would credit stock nobody took.
      await db.batch([
        db.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId),
        db.prepare("DELETE FROM orders WHERE id = ?").bind(orderId),
        ...items
          .filter((_, j) => stockUpdateApplied(results[stockUpdateIndices[j]]))
          .map((prev) => {
            const { sql, params } = buildStockRestore(prev);
            return db.prepare(sql).bind(...params);
          }),
        // Restore promo used_count only if the guarded increment actually applied
        ...(promoApplied && orderData.promoCodeId
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

  // 6. Verify the promo increment applied. If a promo was requested but the
  //    guarded UPDATE affected no rows, the code hit max_uses concurrently
  //    between validation and now — roll the whole order back (delete order +
  //    items, restore every stock decrement) so a capped promo can never be
  //    over-redeemed. The promo was NOT incremented, so it needs no restore.
  if (promoUpdateIndex !== -1 && !promoApplied) {
    await db.batch([
      db.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId),
      db.prepare("DELETE FROM orders WHERE id = ?").bind(orderId),
      // Every decrement was verified as applied by step 5 above before this
      // point is reachable, so all of them are restored here.
      ...items.map((it) => {
        const { sql, params } = buildStockRestore(it);
        return db.prepare(sql).bind(...params);
      }),
    ]);
    throw new Error(
      "Ce code promo n'est plus disponible (limite d'utilisation atteinte)."
    );
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

/**
 * Guarded ->cancelled transition with stock refund, shared by every caller
 * that cancels an order: the customer self-cancel path (cancelOrder below),
 * the stale-pending reaper (reapStalePendingOrders below), and the admin
 * cancel action (actions/admin/orders.ts::cancelOrderAdmin). Do not
 * duplicate this logic elsewhere — two independent "cancel and refund"
 * implementations would drift and one of them would eventually
 * double-refund.
 *
 * The single UPDATE statement carries `AND status = ?` (bound to
 * `fromStatus`, the status the caller read the order in) as part of its
 * WHERE clause, so it can affect the row at most once no matter how many
 * callers race to cancel the same order — a customer clicking "cancel" the
 * same moment an admin cancels it from the dashboard, or the hourly sweep
 * cancelling a stale order an operator is clearing by hand at the same time.
 * Only the caller whose UPDATE actually flips the status sees
 * `meta.changes > 0` and proceeds to (optionally) refund; every other
 * concurrent caller sees `changes === 0` and returns false without touching
 * stock. This is what makes the transition safe under concurrency — refund
 * is conditioned on *this call* having performed the transition, not on the
 * row having been read as `fromStatus` moments earlier (a stale,
 * non-atomic read that a TOCTOU race could invalidate before the write
 * lands — exactly the shape that let two unguarded admin UPDATEs run
 * against a row the sweep had already cancelled, double-crediting stock).
 *
 * `refund: false` (the admin "cancel without refund" option) skips
 * refundOrderStock entirely but keeps the same guarded transition — the
 * race-safety property does not depend on whether a refund happens.
 */
export async function cancelOrderFromStatus(
  orderId: string,
  fromStatus: OrderStatus,
  reason: string,
  opts: { refund?: boolean } = {}
): Promise<boolean> {
  const { refund = true } = opts;

  const result = await execute(
    `UPDATE orders SET status = 'cancelled', cancelled_at = datetime('now'), cancellation_reason = ?, updated_at = datetime('now')
     WHERE id = ? AND status = ?`,
    [reason, orderId, fromStatus]
  );

  if (result.meta.changes === 0) return false;

  if (!refund) return true;

  try {
    await refundOrderStock(orderId);
  } catch (err) {
    // Compensate to keep cancellation and stock consistent: if the refund
    // fails, revert the order back to fromStatus so its stock stays reserved
    // (invariant: a cancelled order has always had its reserved stock
    // returned). The status guard means only this call transitioned the row,
    // so the revert targets exactly the row we just cancelled.
    //
    // The revert is a second, independent D1 call and gets its own
    // try/catch: this function's contract is a plain boolean (every caller —
    // the customer self-cancel path, the reaper, cancelOrderAdmin — expects
    // that shape, so it is not changed here), so `false` is already this
    // function's "structured failure". What must not happen is the revert's
    // own error escaping as an unhandled rejection instead of also
    // collapsing to that same `false`. Both the original refund failure and
    // any revert failure are logged together so the causal chain survives
    // even though the boolean return can't carry it to the caller.
    // A revert matching zero rows — because something else moved the order on
    // between the cancel and here — leaves the same stuck state as a throwing
    // revert, so it collapses to the same branch rather than passing for a
    // successful revert.
    try {
      const revertResult = await execute(
        `UPDATE orders SET status = ?, cancelled_at = NULL, cancellation_reason = NULL, updated_at = datetime('now')
         WHERE id = ? AND status = 'cancelled'`,
        [fromStatus, orderId]
      );
      if (revertResult.meta.changes === 0) {
        throw new Error("compensating revert matched no row (order no longer 'cancelled')");
      }
    } catch (revertErr) {
      console.error(
        "cancelOrderFromStatus: stock refund failed AND compensating revert also failed — order left stuck",
        { orderId, stuckStatus: "cancelled", intendedRevertTo: fromStatus },
        err,
        revertErr
      );
      return false;
    }
    console.error("cancelOrderFromStatus: stock refund failed, reverted", { orderId, fromStatus }, err);
    return false;
  }
  return true;
}

/** Cancels a pending order and refunds its stock. See cancelOrderFromStatus. */
async function cancelPendingOrderById(orderId: string, reason: string): Promise<boolean> {
  return cancelOrderFromStatus(orderId, "pending", reason);
}

export async function cancelOrder(
  orderNumber: string,
  userId: string,
  reason: string
): Promise<boolean> {
  // Resolve the pending order owned by this user first, so we can release its
  // reserved stock. Without this, a customer self-cancel left stock permanently
  // decremented ('cancelled' is a terminal state, so no admin path could ever
  // refund it) — a cost-free denial-of-inventory. See GHSA (stock-refund gap).
  const order = await queryFirst<{ id: string }>(
    "SELECT id FROM orders WHERE order_number = ? AND user_id = ? AND status = 'pending'",
    [orderNumber, userId]
  );
  if (!order) return false;

  return cancelPendingOrderById(order.id, reason);
}

/**
 * Counts a user's currently-open pending orders, scoped to the same
 * REAP_STALE_AFTER_HOURS window the reaper uses. Backs the concurrent-pending
 * cap: the hourly rate limit only bounds *velocity*, not the number of
 * orders simultaneously holding reserved stock — at 5 orders/hour, an account
 * could otherwise keep ~120 orders perpetually pending (steady state against
 * the reaper window). Capping concurrently-open pending orders bounds
 * worst-case reserved stock per user to a small constant regardless of rate
 * or reaper cadence.
 *
 * Excluding orders older than the window (rather than counting every
 * pending order ever created) makes the cap self-releasing on its own clock:
 * a customer who legitimately hits the cap is never stuck waiting on staff
 * action or on the sweep actually having run — their oldest order simply
 * ages out of the count once it turns REAP_STALE_AFTER_HOURS old, the same
 * moment it becomes eligible for the reaper to cancel it.
 *
 * This function is the fast-path, non-atomic check used by
 * actions/checkout.ts for a cheap early rejection with a clear message; the
 * actual enforcement of MAX_PENDING_ORDERS_PER_USER against a burst of
 * concurrent requests is the guarded INSERT in createOrderWithItems, above.
 */
export async function countPendingOrdersForUser(userId: string): Promise<number> {
  const row = await queryFirst<{ total: number }>(
    "SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND status = 'pending' AND created_at >= datetime('now', ?)",
    [userId, `-${REAP_STALE_AFTER_HOURS} hours`]
  );
  return row?.total ?? 0;
}

/** Reason recorded on orders (and echoed to the customer) when the sweep cancels them. */
const REAP_CANCELLATION_REASON =
  "Commande annulée automatiquement : délai de confirmation dépassé.";

/**
 * Fire-and-forget-safe customer notification for an automatically-cancelled
 * order. Every admin-triggered status change already notifies the customer
 * (see actions/admin/orders.ts's sendStatusNotification); the sweep is the
 * one path that flips an order to 'cancelled' with no human in the loop, so
 * without this a customer only finds out by checking their account — on a
 * cash-on-delivery site where the confirmation call *is* the fulfilment
 * step, that reads as the shop silently losing their order.
 *
 * Awaited by the caller but never allowed to throw past this function:
 * notifyOrderStatusUpdate itself already swallows send failures (it calls
 * the Resend-backed sendEmail helper, which never throws, and logs instead),
 * but the caller additionally wraps this in its own try/catch so a failure
 * here — however it happens to surface — can never abort the order's
 * (already-committed) cancellation, and, critically, can never stop the
 * sweep from moving on to the next order in the batch.
 */
async function notifyStaleOrderCancelled(orderNumber: string, userId: string): Promise<void> {
  const customer = await queryFirst<{ email: string; name: string }>(
    "SELECT email, name FROM user WHERE id = ?",
    [userId]
  );
  if (!customer) return;
  await notifyOrderStatusUpdate(customer.email, {
    customerName: customer.name,
    orderNumber,
    newStatus: "cancelled",
    reason: REAP_CANCELLATION_REASON,
  });
}

/**
 * Cancels up to `batchSize` pending orders older than `olderThanHours` and
 * releases their reserved stock, reusing the exact guarded transition
 * customers use to self-cancel (cancelPendingOrderById, itself a thin
 * wrapper over the shared cancelOrderFromStatus) — see that function's doc
 * comment for why concurrent cancellation of the same order (by a customer,
 * an admin, or another sweep run) can never double-refund.
 *
 * Bounded and resumable: nothing has ever reaped before this task, so the
 * first real invocation could otherwise face the entire historical backlog
 * in one call. `ORDER BY created_at ASC LIMIT batchSize + 1` fetches at most
 * one row more than the batch — if that extra row comes back, there is more
 * work than this call processed, reported via `hasMore` so the caller (the
 * scheduled invoker) knows to run again rather than assuming the sweep is
 * complete. `total` counts only the orders this call actually attempted, not
 * the full backlog.
 *
 * Each order is cancelled independently (not as a single D1 batch): the
 * guard-then-refund sequence for one order must complete (including its
 * compensating revert on refund failure) before affecting the next, so a
 * failure on one stale order never blocks or corrupts the others. The whole
 * per-order call is additionally wrapped in try/catch — an unexpected error
 * (e.g. a transient D1 failure on the guarded UPDATE itself, not just a
 * refund failure) is tallied as `skipped` and logged rather than aborting
 * the rest of the batch, so one bad row can't stop the sweep from reaping
 * everything else it fetched. The customer notification sent after a
 * successful cancellation is inside that same try/catch and does not affect
 * the cancelled/skipped tally either way — a notification failure is logged
 * and the order still counts as cancelled (its stock was genuinely
 * refunded; only the courtesy email failed).
 */
export async function reapStalePendingOrders(
  olderThanHours: number = REAP_STALE_AFTER_HOURS,
  batchSize: number = REAP_BATCH_SIZE
): Promise<{ cancelled: number; skipped: number; total: number; hasMore: boolean }> {
  const staleOrders = await query<{ id: string; order_number: string; user_id: string }>(
    "SELECT id, order_number, user_id FROM orders WHERE status = 'pending' AND created_at < datetime('now', ?) ORDER BY created_at ASC LIMIT ?",
    [`-${olderThanHours} hours`, batchSize + 1]
  );

  const hasMore = staleOrders.length > batchSize;
  const toProcess = hasMore ? staleOrders.slice(0, batchSize) : staleOrders;

  let cancelled = 0;
  let skipped = 0;

  for (const order of toProcess) {
    try {
      const ok = await cancelPendingOrderById(order.id, REAP_CANCELLATION_REASON);
      if (ok) {
        cancelled++;
        try {
          await notifyStaleOrderCancelled(order.order_number, order.user_id);
        } catch (err) {
          // The cancellation and refund already committed above — a failed
          // courtesy email must not undo that, nor stop the loop from
          // reaching the remaining orders in this batch.
          console.error(`reapStalePendingOrders: notification failed for order ${order.id}`, err);
        }
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`reapStalePendingOrders: unexpected error cancelling order ${order.id}, skipping`, err);
      skipped++;
    }
  }

  return { cancelled, skipped, total: toProcess.length, hasMore };
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
    const { sql, params } = buildStockRestore({
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
    });
    statements.push(db.prepare(sql).bind(...params));
  }

  try {
    const results = await db.batch(statements);

    // Verify all updates succeeded
    const failedUpdates = results.filter((r) => !stockUpdateApplied(r));
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
