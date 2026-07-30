/**
 * The SQL that reserves stock for an order and the SQL that gives it back.
 *
 * Shared on purpose between the web checkout (`lib/db/orders.ts`) and the
 * WhatsApp Worker (`workers/whatsapp/src/tools/orders.ts`). Two independent
 * copies of "take stock, then put back exactly what you took" is precisely how
 * one of them ends up crediting stock it never debited — the failure this
 * repository has already met once on the cancellation path.
 *
 * Only the *statements* are shared. The orchestration around them is not, and
 * cannot reasonably be: the web path reserves an order row first (to enforce
 * the concurrent-pending cap in the same statement as the write) and has a
 * promo counter to compensate too, while the Worker has neither, no
 * `ActionResult`, and a customer-visible cart row it must not destroy on a
 * refusal. What both must agree on is the shape of the two statements and the
 * rule for reading their results — that is what lives here.
 *
 * Pure strings and bind parameters: no imports, no D1 handle, nothing that
 * reaches the Worker bundle.
 */

/** A product line to reserve or release. A null `variantId` means the product row itself. */
export interface StockTarget {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface StockStatement {
  sql: string;
  params: unknown[];
}

function tableFor(target: StockTarget): "product_variants" | "products" {
  return target.variantId ? "product_variants" : "products";
}

function rowIdFor(target: StockTarget): string {
  return target.variantId ?? target.productId;
}

/**
 * Compare-and-swap reservation. `AND stock_quantity >= ?` puts the availability
 * check and the write in one statement, so two orders racing for the last unit
 * cannot both read "1 available" and both decrement it.
 *
 * The caller MUST inspect `meta.changes`. A refused decrement is not an error:
 * D1 reports it as `changes === 0` and commits the rest of the batch around it.
 * A predicate nobody reads the result of protects nothing — it just moves the
 * oversell from "negative stock" to "confirmed order with no stock reserved".
 */
export function buildStockDecrement(target: StockTarget): StockStatement {
  return {
    sql: `UPDATE ${tableFor(target)} SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?`,
    params: [target.quantity, rowIdFor(target), target.quantity],
  };
}

/**
 * Compensating release, for a reservation that must be undone.
 *
 * Carries no quantity guard on purpose — it adds stock back, so it can never
 * drive the row negative. What it must never do is give back stock that was
 * never taken: apply it only to a decrement that actually applied
 * (`meta.changes > 0`), never to the whole batch on the assumption that every
 * decrement landed.
 *
 * `meta.changes === 0` on a release is a failure, not a no-op: it means the
 * row vanished (or was replaced) since the reservation, and the stock is
 * still missing. Callers are expected to say so rather than report success.
 */
export function buildStockRestore(target: StockTarget): StockStatement {
  return {
    sql: `UPDATE ${tableFor(target)} SET stock_quantity = stock_quantity + ? WHERE id = ?`,
    params: [target.quantity, rowIdFor(target)],
  };
}

/**
 * Fail-closed reading of a guarded UPDATE's result.
 *
 * Anything that is not affirmatively a successful write — `changes: 0`, a
 * missing result slot because the driver returned a shorter array than the
 * statements it was given — counts as "did not apply". `changes === 0` would
 * instead treat a missing slot as success.
 */
export function stockUpdateApplied(result: { meta: { changes: number } } | undefined): boolean {
  return (result?.meta?.changes ?? 0) > 0;
}
