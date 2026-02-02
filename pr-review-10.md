# PR #10 Review: Checkout Flow with Server-Validated Orders

**Scope:** 10 files added/modified, +1273 lines. Implements checkout page, server-side order creation, promo codes, address management, delivery zones, and order confirmation.

---

## Review initiale

### Points positifs

1. **Atomic batch operations** — `createOrderWithItems` uses `db.batch()` for order + items + stock decrements in a single D1 batch.
2. **Stock guards** — `WHERE stock_quantity >= ?` prevents negative stock, and post-batch verification of `meta.changes === 0` catches concurrent races.
3. **Server-side price re-computation** — Prices are read from DB, not trusted from the client.
4. **Auth gating** — `requireAuth()` on both server actions and pages.
5. **Zod validation with refinement** — The `savedAddressId` vs new address conditional logic is clean.
6. **Clean component structure** — Good separation between page (server), form (client), and confirmation (client).

### 14 points releves

| # | Severite | Point | Status |
|---|----------|-------|--------|
| 1 | Critique | TOCTOU race — stock updates apres order insert, pas de rollback | ✅ Corrige — stock updates avant insert + rollback si echec |
| 2 | Critique | N+1 queries pour validation du panier | ✅ Corrige — batch fetch `WHERE id IN (...)` |
| 3 | Critique | `redirect()` dans server action | ✅ Corrige — retourne `orderNumber`, client fait `router.push()` |
| 4 | Important | `generateOrderNumber` pas collision-safe | ✅ Corrige — synchrone, depend du UNIQUE constraint DB |
| 5 | Important | Index fragile post-batch stock verification | ✅ Corrige — `stockUpdateIndices[]` explicite |
| 6 | Important | Double auth sur validation promo | ✅ Corrige — `resolvePromoCode` interne sans auth |
| 7 | Important | Total peut etre negatif | ✅ Corrige — `Math.max(0, ...)` |
| 8 | Important | Discount pourcentage non plafonne | ✅ Corrige — `Math.min(rawDiscount, subtotal)` |
| 9 | Mineur | "Abidjan" en dur | ✅ Corrige — utilise `saved.city` |
| 10 | Mineur | `query()[0]` au lieu de `queryFirst` | ✅ Corrige |
| 11 | Mineur | Pas de clearing KV cote serveur | ⏳ Non adresse (a prevoir quand KV sera utilise pour le panier) |
| 12 | Mineur | Phone regex trop permissive | ✅ Corrige — `^(\+225)?[0-9]{10}$` |
| 13 | Mineur | `CheckoutInput` vs `CheckoutOutput` | ✅ Acceptable — `CheckoutOutput` utilise apres safeParse |
| 14 | Mineur | `order-confirmation` "use client" juste pour cart clear | ✅ Corrige — `ClearCartEffect` composant separe |

---

## Re-review apres corrections (commit f6c1cf9)

**12/14 points corriges.** Les 3 points critiques sont tous resolus.

### Nouveau point releve

- **`generateOrderNumber` sans garantie d'unicite** (`lib/db/orders.ts:6-12`) — la pre-check DB a ete retiree mais aucun retry sur erreur de contrainte UNIQUE. Avec 6 chars alphanumeriques (~2.2 milliards de combinaisons), le risque est faible mais augmente avec le volume. Suggestion : catch l'erreur de contrainte et retry, ou utiliser `nanoid()` directement.

### Verdict

**Approuve.** La PR est prete a merger. Le point KV (item 11) et le collision handling sur `generateOrderNumber` sont des ameliorations a planifier pour une future iteration.
