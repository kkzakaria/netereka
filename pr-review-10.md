# PR #10 Review: Checkout Flow with Server-Validated Orders

**Scope:** 10 files added/modified, +1273 lines. Implements checkout page, server-side order creation, promo codes, address management, delivery zones, and order confirmation.

---

## Points positifs

1. **Atomic batch operations** — `createOrderWithItems` uses `db.batch()` for order + items + stock decrements in a single D1 batch.
2. **Stock guards** — `WHERE stock_quantity >= ?` prevents negative stock, and post-batch verification of `meta.changes === 0` catches concurrent races.
3. **Server-side price re-computation** — Prices are read from DB, not trusted from the client.
4. **Auth gating** — `requireAuth()` on both server actions and pages.
5. **Zod validation with refinement** — The `savedAddressId` vs new address conditional logic is clean.
6. **Clean component structure** — Good separation between page (server), form (client), and confirmation (client).

---

## Problemes critiques

### 1. TOCTOU race on stock check (`actions/checkout.ts:140-187`)
The stock is checked with individual `SELECT` queries in a for-loop, then decremented later in the batch. Between the check and the batch, another request could consume the stock. The batch `WHERE stock_quantity >= ?` guard mitigates this, but the **order row is already inserted** when the stock update fails. The post-batch check throws an error, but D1 `batch()` is **not a transaction that rolls back** — partial writes persist. The order will exist with status "pending" but stock wasn't decremented.

**Fix:** Either use a real D1 transaction, delete the order row in the catch block, or restructure so stock updates come *before* the order insert in the batch.

### 2. N+1 queries for cart validation (`actions/checkout.ts:140-187`)
Each cart item fires 1-2 `SELECT` queries sequentially. For a 10-item cart that's 10-20 round-trips to D1. Use a single `WHERE id IN (...)` query and validate in-memory.

### 3. `redirect()` inside server action (`actions/checkout.ts:266`)
`redirect()` throws a `NEXT_REDIRECT` error internally. The caller in `checkout-form.tsx:496` wraps it in code that checks `result.success` — the redirect throws *before* returning. This works by accident (Next.js intercepts the throw) but is fragile. Better to return `{ success: true, orderNumber }` and let the client `router.push()`.

---

## Problemes importants

### 4. `generateOrderNumber` is not collision-safe under concurrency (`lib/db/orders.ts:48-62`)
Uses `Math.random()` with 5 retry attempts. The uniqueness check + insert is not atomic — two concurrent requests could generate the same number. Rely on the DB `UNIQUE` constraint and catch the error instead of pre-checking.

### 5. Post-batch stock verification uses fragile index math (`lib/db/orders.ts:179-187`)
```ts
const stockUpdateIndex = 1 + i * 2 + 1;
```
Assumes a specific batch layout. Fragile to maintain — consider tagging results or iterating differently.

### 6. Promo code validated twice (`actions/checkout.ts:200-207`)
`createOrder` calls `validatePromoCode()` which calls `requireAuth()` again. Redundant auth check + extra DB query. Extract promo validation into an internal function without the auth wrapper.

### 7. `total` can go negative (`actions/checkout.ts:209`)
```ts
const total = subtotal + deliveryFee - discountAmount;
```
A fixed-amount promo code exceeding `subtotal + deliveryFee` results in a negative total. Add `Math.max(0, ...)`.

### 8. Percentage discount not capped (`actions/checkout.ts:67-70`)
A 100%+ percentage code would give a discount >= subtotal. Cap discount at subtotal.

---

## Problemes mineurs

### 9. Hardcoded "Abidjan" (`actions/checkout.ts:232`)
City is hardcoded in delivery address formatting. Will break if the platform expands.

### 10. `getDeliveryZoneByCommune` uses `query` + `[0]` instead of `queryFirst` (`lib/db/delivery-zones.ts:30-36`)
Inconsistent with the rest of the codebase.

### 11. No server-side cart clearing
Cart is only cleared client-side via Zustand in `OrderConfirmation`. If KV is used for cart persistence, the server should also clear it.

### 12. Phone regex too loose (`lib/validations/checkout.ts:13-16`)
`/^\+?[0-9]{8,15}$/` accepts any 8-15 digit number. Ivory Coast numbers are `+225` + 10 digits. Consider tightening.

### 13. `CheckoutInput` uses `z.input` not `z.infer` (`lib/validations/checkout.ts:34`)
The server action should use `CheckoutOutput` (parsed type) after `safeParse`.

### 14. `order-confirmation.tsx` is `"use client"` just for cart clearing
Consider a smaller client wrapper for the side effect only.

---

## Resume

| Severite | Count |
|----------|-------|
| Critique | 3 |
| Important | 5 |
| Mineur | 6 |

The architecture is solid — server-validated prices, atomic batch writes, and proper auth gating. The main concerns are the **TOCTOU race + non-transactional batch** that can leave orphaned orders, and the **N+1 queries**. Recommend addressing the 3 critical issues before merging.
