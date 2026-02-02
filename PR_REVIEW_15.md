# Code Review — PR #15: Account Section

**PR:** feat: add customer account section (+2 669 / −27, 46 fichiers)

---

## Revue initiale (v1)

16 problèmes identifiés (2 critiques, 4 hauts, 6 moyens, 4 bas). Voir historique git pour le détail.

---

## Re-revue (v2) — après corrections

### Bilan des 16 points originaux

| # | Issue | Statut |
|---|-------|--------|
| 1 | Race condition `toggleWishlist` | ✅ Corrigé — `atomicToggleWishlist` avec DELETE + INSERT OR IGNORE |
| 2 | Pas de validation `productId` | ✅ Corrigé — validation Zod + try/catch |
| 3 | Cast non sûr `user.phone` | ✅ Corrigé — `String((user as Record<string, unknown>).phone ?? "")` |
| 4 | TOCTOU `cancelOrder` | ✅ Corrigé — single UPDATE + check `meta.changes` |
| 5 | `setDefaultAddress` toujours true | ✅ Corrigé — check `results[1].meta.changes === 0` → return false |
| 6 | `orderNumber` non validé | ✅ Corrigé — regex `/^ORD-[A-Z0-9]{4,10}$/` + `notFound()` |
| 7 | `status` non validé | ✅ Corrigé — validation contre `VALID_STATUSES` |
| 8 | Pagination illimitée | ✅ Corrigé — helper `getPaginationPages()` avec ellipsis |
| 9 | `parseInt` NaN | ✅ Corrigé — `Number(sp.page) \|\| 1` |
| 10 | Rating arrondi trompeur | ⚠️ Partiel — moyenne numérique affichée à côté des étoiles, mais pas de demi-étoiles |
| 11 | `ActionResult` dupliqué | ✅ Corrigé — extrait dans `lib/types/actions.ts` |
| 12 | `revalidatePath` trop large | ✅ Corrigé — revalidation du slug spécifique |
| 13 | Crash `UserAvatar` nom vide | ✅ Corrigé — fallback `(user.name \|\| "?")` |
| 14 | Wishlist UI stale | ✅ Corrigé — `router.refresh()` + `useOptimistic` |
| 15 | `DialogDescription` manquant | ✅ Corrigé — ajouté dans les deux dialogs |
| 16 | `address.city` inexistant | ✅ Corrigé — ajouté au schema Zod + formulaire (défaut "Abidjan") |

**Score : 15/16 corrigés, 1 partiellement (acceptable)**

---

## Nouveaux problèmes identifiés (v2)

### NEW-1 (MOYEN) : `atomicToggleWishlist` n'est pas réellement atomique
**Fichier :** `lib/db/wishlist.ts`

Le DELETE et l'INSERT conditionnel sont deux statements séparés, pas dans un `db.batch()`. Entre le DELETE (0 changes) et l'INSERT, un appel concurrent peut s'intercaler. `INSERT OR IGNORE` empêche la corruption de données, mais la valeur de retour (`added: true/false`) peut être incorrecte pour un des appelants concurrents.

**Fix :** Utiliser `db.batch([deleteStmt, insertStmt])` pour grouper les opérations.

### NEW-2 (MOYEN) : `setDefaultAddress` peut laisser l'utilisateur sans adresse par défaut
**Fichier :** `lib/db/addresses.ts`

Si l'adresse cible n'existe pas : le premier statement remet tous les `is_default = 0`, puis le second ne touche rien, et la fonction retourne `false`. Mais l'ancien défaut a déjà été effacé. Aucune logique de restauration.

**Fix :** Vérifier l'existence de l'adresse AVANT de modifier quoi que ce soit, ou utiliser une transaction pour rollback.

### NEW-3 (BAS) : `statusConfig` typé `Record<string, ...>` au lieu de `Record<OrderStatus, ...>`
**Fichier :** `components/storefront/order-card.tsx`

Le compilateur ne détectera pas un statut manquant ou une typo. Le fallback runtime fonctionne, mais un type plus strict serait préférable.

### NEW-4 (BAS) : Pas de vérification d'existence du produit dans `atomicToggleWishlist`
**Fichier :** `lib/db/wishlist.ts`

La validation Zod vérifie le format du `productId`, mais pas que le produit existe en DB. Sans contrainte FK sur la table wishlist, des entrées orphelines peuvent s'accumuler. Le try/catch attrape les erreurs FK, mais si la contrainte n'existe pas, c'est silencieux.

---

## Récapitulatif v2

| # | Sévérité | Problème | Action |
|---|----------|----------|--------|
| NEW-1 | 🟡 Moyen | `atomicToggleWishlist` pas dans un batch | Grouper dans `db.batch()` |
| NEW-2 | 🟡 Moyen | `setDefaultAddress` efface le défaut avant de valider | Vérifier existence d'abord |
| NEW-3 | 🔵 Bas | `statusConfig` trop permissif en type | Typer avec `Record<OrderStatus, ...>` |
| NEW-4 | 🔵 Bas | Pas de vérification d'existence produit | Ajouter FK ou check en amont |

**Verdict v2 :** Les 16 problèmes originaux sont corrigés (15 complètement, 1 acceptable). 4 nouveaux problèmes mineurs détectés (2 moyens, 2 bas). La PR est prête à merger après correction de NEW-1 et NEW-2, ou en l'état si le risque de concurrence est jugé acceptable sur D1 Cloudflare Workers (concurrence limitée par design).
