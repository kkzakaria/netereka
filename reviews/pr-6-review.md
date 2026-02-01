# Revue de code : PR #6 — Catalogue produits et pages storefront

Bon travail sur cette PR qui pose les bases du catalogue et des pages storefront. L'architecture est cohérente et les composants sont bien structurés. Voici les points à corriger avant merge.

---

## CRITIQUE

### 1. `parseInt` NaN non géré dans la pagination — `app/(storefront)/c/[slug]/page.tsx`
```typescript
const currentPage = Math.max(1, parseInt(page ?? "1", 10));
```
Si `page` vaut `"abc"`, `parseInt` retourne `NaN`, et `Math.max(1, NaN)` retourne `NaN`. Le `offset` devient `NaN`, ce qui casse la requête D1. N'importe quel utilisateur peut déclencher ça via l'URL.

**Fix :** `const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);`

### 2. `ORDER BY RANDOM()` pour les produits similaires — `lib/db/products.ts`
```sql
ORDER BY RANDOM() LIMIT ?
```
Full table scan sur D1 à chaque vue produit. Non cacheable car les résultats changent à chaque requête. Avec la croissance du catalogue, cela va provoquer des timeouts sur Cloudflare Workers (limite de CPU time).

**Fix :** Utiliser un tri déterministe (`ORDER BY created_at DESC`) ou cacher le résultat en KV.

---

## HAUT

### 3. `force-dynamic` sur la homepage avec 6 requêtes DB parallèles — `app/(storefront)/page.tsx`
```typescript
export const dynamic = "force-dynamic";
```
La page d'accueil fait 6 requêtes D1 à chaque visite. Aucune de ces données ne change fréquemment. Utiliser `revalidate = 60` (ISR) serait bien plus approprié pour la page la plus visitée du site.

### 4. Slugs de catégories hardcodés dans la homepage
```typescript
getProductsByCategorySlug("smartphones", 10),
getProductsByCategorySlug("ordinateurs", 10),
getProductsByCategorySlug("tablettes", 10),
```
Si ces slugs changent en DB, les sections seront vides sans erreur visible. Couplage fragile.

### 5. Double requête produit dans `generateMetadata` + `ProductPage` — `app/(storefront)/p/[slug]/page.tsx`
Les deux fonctions appellent `getProductBySlug(slug)` indépendamment. Next.js ne déduplique **pas** les appels async arbitraires (seulement `fetch()`). Résultat : 6 requêtes D1 au lieu de 3 par page produit.

**Fix :** Wrapper avec `React.cache()` :
```typescript
const getProductBySlugCached = cache(getProductBySlug);
```

### 6. Même problème sur la page catégorie — `app/(storefront)/c/[slug]/page.tsx`
`getCategoryBySlug` est appelé 2 fois (metadata + page).

### 7. Seed SQL sans transaction — `db/seeds/catalogue.sql`
```sql
DELETE FROM product_images;
DELETE FROM product_variants;
-- ...
```
Sans `BEGIN`/`COMMIT`, un échec partiel laisse la DB dans un état incohérent.

---

## MOYEN

### 8. Logique "has variants" incorrecte dans `ProductCard` — `components/storefront/product-card.tsx`
```typescript
const hasVariants = product.compare_price && product.compare_price > product.base_price;
```
`compare_price` est le prix barré (ancien prix), pas un indicateur de variants. Un produit peut avoir des variants au même prix, ou un `compare_price` sans variants. Le label "À partir de" est trompeur ici.

### 9. `parseAttributes()` appelé de manière excessive dans `VariantSelector`
`JSON.parse` est appelé à chaque itération de variants pour chaque clic. Mémoïser le parsing une seule fois réduirait le travail CPU, important pour les appareils bas de gamme du marché ivoirien.

### 10. `process.env` au module scope dans `lib/utils/images.ts`
```typescript
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || "/images";
```
Sur Cloudflare Workers, `process.env` n'est pas fiable au module scope. La valeur risque de toujours fallback sur `"/images"` en prod.

### 11. "Charger plus" fait une navigation complète — `load-more-button.tsx`
`router.push()` recharge la page au lieu d'ajouter le contenu. L'utilisateur perd le scroll et les produits déjà chargés. Soit renommer en "Page suivante", soit implémenter un vrai "load more" avec append côté client.

### 12. Mauvais content-type pour fichiers `.avif` — `scripts/upload-to-r2.sh`
Des fichiers `.avif` sont uploadés avec `--content-type=image/webp`. Devrait être `image/avif`.

---

## BAS

### 13. Couleurs hardcodées dans `HeroBanner` au lieu des CSS variables
`from-[#183C78]`, `bg-[#00FF9C]` — ne respecte pas le design system oklch et ne répondra pas aux changements de thème.

### 14. Pas de pages `not-found.tsx` custom pour `/c/[slug]` et `/p/[slug]`
Les `notFound()` afficheront la 404 par défaut de Next.js, pas cohérent avec le design storefront.

### 15. Bouton "Ajouter au panier" toujours disabled
Intentionnel pour l'instant ("Bientôt disponible") mais pas de `TODO` pour tracker quand l'activer.

---

## Résumé

| Sévérité | Nombre | Points clés |
|----------|--------|-------------|
| Critique | 2 | NaN pagination, ORDER BY RANDOM() |
| Haut | 5 | force-dynamic homepage, requêtes dupliquées, seed sans transaction |
| Moyen | 5 | Logique variants, env Cloudflare, content-type avif |
| Bas | 3 | Design system, 404 custom, bouton panier |

**Recommandation :** Corriger les 2 critiques et les 5 hauts avant merge. Les moyens peuvent être traités en follow-up.
