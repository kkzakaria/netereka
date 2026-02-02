# Code Review — PR #15: Account Section

**PR:** feat: add customer account section (+2 669 / −27, 46 fichiers)

---

## Revue initiale (v1)

16 problèmes identifiés (2 critiques, 4 hauts, 6 moyens, 4 bas). Voir historique git pour le détail.

---

## Re-revue (v2) — après corrections

15/16 points originaux corrigés, 1 partiel (acceptable). 4 nouveaux problèmes détectés. Voir historique git pour le détail.

---

## Re-revue (v3) — après correction des 4 nouveaux points

### Bilan NEW-1 à NEW-4

| # | Issue | Statut |
|---|-------|--------|
| NEW-1 | `atomicToggleWishlist` pas dans un batch | ✅ Corrigé — DELETE + INSERT dans `db.batch()` |
| NEW-2 | `setDefaultAddress` efface le défaut avant validation | ✅ Corrigé — `getAddressById` vérifie l'existence AVANT de modifier |
| NEW-3 | `statusConfig` typé `Record<string, ...>` | ✅ Corrigé — typé `Record<OrderStatus, ...>` |
| NEW-4 | Pas de vérification d'existence produit | ✅ Corrigé — `SELECT id FROM products` avant le toggle |

### Remarque v3 (résolue en v4)

~~`atomicToggleWishlist` faisait 3 queries en cas de suppression.~~ Corrigé : DELETE conditionnel → INSERT seulement si nécessaire. 2 queries max, `INSERT OR IGNORE` pour les races.

---

## Verdict final (v4)

**Tous les problèmes sont corrigés. La PR est prête à merger.** Aucun problème bloquant. Architecture propre, server actions protégées, validation en place, edge cases gérés.
