# Re-revue PR #6 — après corrections

## Statut des 17 points originaux

| # | Sévérité | Issue | Statut |
|---|----------|-------|--------|
| 1 | CRITIQUE | parseInt NaN pagination | ✅ Corrigé |
| 2 | CRITIQUE | ORDER BY RANDOM() | ✅ Corrigé |
| 3 | HAUT | force-dynamic homepage | ✅ Corrigé (`revalidate = 60`) |
| 4 | HAUT | Slugs catégories hardcodés | ✅ Corrigé (dynamique via `getCategories()`) |
| 5-6 | HAUT | Requêtes dupliquées metadata+page | ✅ Corrigé (`React.cache()`) |
| 7 | HAUT | Seed SQL sans transaction | ✅ Corrigé (`BEGIN`/`COMMIT`) |
| 8 | MOYEN | Logique "has variants" incorrecte | ✅ Corrigé (`variant_count`) |
| 9 | MOYEN | JSON.parse excessif | ✅ Corrigé (`useMemo` + `Map`) |
| 10 | MOYEN | process.env module scope | ✅ N/A (était déjà dans le body de la fonction) |
| 11 | MOYEN | "Charger plus" navigation complète | ⚠️ Partiel (label renommé "Page suivante") |
| 12 | MOYEN | .avif mauvais content-type | ✅ Corrigé (`image/avif`) |
| 13 | BAS | Couleurs hex hardcodées | ✅ Corrigé (CSS variables) |
| 14 | BAS | Pas de 404 custom | ✅ Corrigé |
| 15 | BAS | Bouton panier sans TODO | ✅ Corrigé |

**Score : 14/15 corrigés, 1 partiellement corrigé.**

## Nouveaux points introduits par les corrections

### NEW-1 (BAS) : Variables CSS hero sans override dark mode
Les nouvelles variables `--hero-bg`, `--hero-bg-dark`, `--hero-accent` dans `globals.css` ne sont définies que dans `:root`, sans override `.dark`. Acceptable pour l'instant vu que le hero est navy sur fond navy, mais à noter pour l'avenir.

### NEW-2 (BAS) : Waterfall de requêtes sur la homepage
Le fetch dynamique des catégories crée un waterfall (d'abord `getCategories()`, puis `getProductsByCategorySlug()` pour chacune). C'est inhérent au design et acceptable avec le ISR 60s.

## Verdict

**Prête à merger.** Toutes les issues critiques et hautes sont corrigées. Les deux nouveaux points sont bas et ne bloquent pas.
