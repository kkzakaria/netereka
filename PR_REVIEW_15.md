# Code Review — PR #15: Account Section

**PR:** feat: add customer account section (+2 669 / −27, 46 fichiers)

---

## Résumé

La PR ajoute une section compte client complète : profil, commandes, adresses, wishlist, et avis. L'architecture est bien structurée (server actions + DB helpers + validation Zod). Cependant, plusieurs problèmes de sécurité, de robustesse et de cohérence méritent d'être corrigés avant merge.

---

## CRITIQUE

### 1. Race condition dans `toggleWishlist` (actions/wishlist.ts)
Le pattern check-then-act (`isInWishlist` → `remove` / `add`) n'est pas atomique. Deux appels concurrents (double-clic, deux onglets) peuvent produire un état incohérent.

**Fix :** Utiliser un seul statement SQL type `INSERT ... ON CONFLICT DO DELETE` ou wraper dans une transaction D1.

### 2. Pas de validation de `productId` dans `toggleWishlist` (actions/wishlist.ts:7)
Le `productId` vient du client sans aucune validation. Un ID inexistant provoque une erreur 500 non gérée (violation FK).

**Fix :** Valider le format + try/catch autour de l'insert, ou vérifier l'existence du produit.

---

## HAUT

### 3. Cast non sûr pour `user.phone` (app/(storefront)/account/page.tsx:17)
```ts
phone: (user as Record<string, unknown>).phone as string ?? ""
```
Double-cast qui contourne TypeScript. Si `phone` est absent, le runtime obtient `undefined` typé comme `string`.

**Fix :** Étendre le type User pour inclure `phone`, ou utiliser `String((user as any).phone ?? "")`.

### 4. Double-fetch + TOCTOU dans `cancelOrder` (lib/db/orders.ts:39-54)
`getOrderByNumber` est appelé avant l'`UPDATE ... WHERE status = 'pending'`. Le SELECT est redondant car le WHERE du UPDATE fait déjà le guard. Il y a aussi une fenêtre de race condition entre les deux queries.

**Fix :** Exécuter directement l'UPDATE et vérifier `result.meta.changes > 0`.

### 5. `setDefaultAddress` retourne toujours `true` (lib/db/addresses.ts:73-85)
Si l'`id` n'existe pas, le batch a déjà remis tous les `is_default = 0`, puis l'update ciblé touche 0 rows. L'utilisateur se retrouve sans adresse par défaut.

**Fix :** Vérifier `result[1].meta.changes > 0`. Si 0, rollback (remettre l'ancien default) ou retourner `false`.

### 6. Pas de validation du format `orderNumber` (app/(storefront)/account/orders/[orderNumber]/page.tsx:14)
Le paramètre d'URL est passé directement à la query. Pas d'injection SQL (query paramétrée), mais aucune validation de format.

**Fix :** Valider avec un regex type `/^NET-[A-Z0-9]+$/` avant la query.

---

## MOYEN

### 7. `status` non validé contre les valeurs autorisées (account/orders/page.tsx:27)
Le query param `?status=...` est passé tel quel à la DB sans vérification contre le type `OrderStatus`.

### 8. Pagination sans borne supérieure (account/orders/page.tsx:36-50)
Si un utilisateur a des milliers de commandes, tous les liens de page sont rendus. Ajouter une logique d'ellipsis ou limiter les pages affichées.

### 9. `parseInt` sans gestion de NaN (account/orders/page.tsx:28)
```ts
const page = Math.max(1, parseInt(sp.page ?? "1", 10));
```
`parseInt("abc")` → `NaN`, et `Math.max(1, NaN)` → `NaN`. Le `offset` de la query sera `NaN`.

**Fix :** `Number(sp.page) || 1`

### 10. Rating arrondi à l'entier (p/[slug]/page.tsx:18)
`Math.round(stats.average)` fait perdre la précision (4.4 → 4 étoiles, 4.5 → 5). Afficher la moyenne numérique à côté ou supporter les demi-étoiles.

### 11. Interface `ActionResult` dupliquée 3 fois
Identique dans `actions/account.ts`, `actions/addresses.ts`, et `actions/reviews.ts`.

**Fix :** Extraire dans `lib/types/actions.ts`.

### 12. `revalidatePath("/p/[slug]", "page")` invalide TOUTES les pages produit (actions/reviews.ts:44)
Après un avis, toutes les pages produit sont invalidées au lieu de celle du produit concerné.

**Fix :** Passer le slug et revalider `/p/${slug}` spécifiquement.

---

## BAS

### 13. `UserAvatar` crash si `user.name` est vide (header-user-menu.tsx)
`"".split(" ").map(w => w[0])` produit `[undefined]` → affiche "undefined".

### 14. Wishlist : le produit reste visible après suppression (wishlist-grid.tsx)
Le `revalidatePath` ne rafraîchit pas la vue courante immédiatement. L'item reste affiché.

**Fix :** Utiliser `useRouter().refresh()` côté client ou un state optimiste.

### 15. `DialogDescription` manquant (address-list.tsx, reviewable-products.tsx)
Radix émet un warning console et c'est nécessaire pour l'accessibilité (lecteurs d'écran).

### 16. `address.city` utilisé dans le template mais absent du formulaire/schema (address-card.tsx:47)
Le champ `city` n'est ni dans le formulaire ni dans le schema Zod. Le rendu affichera `undefined`.

---

## Récapitulatif

| # | Sévérité | Problème |
|---|----------|----------|
| 1 | 🔴 Critique | Race condition `toggleWishlist` |
| 2 | 🔴 Critique | Pas de validation `productId` |
| 3 | 🟠 Haut | Cast non sûr `user.phone` |
| 4 | 🟠 Haut | TOCTOU `cancelOrder` |
| 5 | 🟠 Haut | `setDefaultAddress` toujours `true` |
| 6 | 🟠 Haut | `orderNumber` non validé |
| 7 | 🟡 Moyen | `status` non validé |
| 8 | 🟡 Moyen | Pagination illimitée |
| 9 | 🟡 Moyen | `parseInt` NaN |
| 10 | 🟡 Moyen | Rating arrondi trompeur |
| 11 | 🟡 Moyen | `ActionResult` dupliqué |
| 12 | 🟡 Moyen | `revalidatePath` trop large |
| 13 | 🔵 Bas | Crash `UserAvatar` nom vide |
| 14 | 🔵 Bas | Wishlist UI stale |
| 15 | 🔵 Bas | `DialogDescription` manquant |
| 16 | 🔵 Bas | `address.city` inexistant |

**Verdict :** Bonne architecture globale. Corriger les 2 critiques et les 4 hauts avant merge. Les moyens peuvent être adressés dans un follow-up.
