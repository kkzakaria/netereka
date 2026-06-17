# Spec — Flux produits Google Merchant Center

**Date :** 2026-06-17
**Statut :** Design validé, prêt pour planification
**Périmètre :** V1 — produit de base (pas de variantes)

---

## Objectif

Générer dynamiquement un flux produits au format Google Shopping, exposé sur une route Next.js, alimenté par la DB D1. Permet :
- des **listings gratuits** dans Google Shopping (onglet Shopping + surfaces gratuites) ;
- une base pour les **Shopping Ads** plus tard.

Google Merchant Center « fetch » le flux par URL (récupération planifiée, ~1×/jour).

## Contexte produit (mesuré sur le catalogue)

- 231 produits actifs/non-draft. `sku` : 230/231. `brand` : 228/231. `short_description` : 9/231 (→ fallback `description`). `compare_price` : 36 (promos).
- Pas de colonne GTIN/code-barres → identification par **`brand` + `mpn`(sku)** (satisfait la règle Google « 2 identifiants sur 3 »).
- 33 produits ont des variantes — **hors périmètre V1** (1 entrée par produit de base).
- Images dans `product_images` (`url`, `is_primary`, `sort_order`, `variant_id`).

## Décisions de design

1. **Format** : RSS 2.0 XML avec namespace `xmlns:g="http://base.google.com/ns/1.0"`.
2. **Route** : `app/feed.xml/route.ts` → `https://netereka.ci/feed.xml`. `export const dynamic = "force-dynamic"` (binding D1 au runtime — cf. leçon sitemap). `Content-Type: application/xml; charset=utf-8`.
3. **Sélection** : `is_active = 1 AND is_draft = 0`. **Ruptures incluses** (`availability` calculé). **Exclusion** des produits sans image (Google rejette sans `image_link`) — nombre exclu loggé.
4. **Variantes** : non (V1 produit de base, pas de `item_group_id`).
5. **`google_product_category`** : mapping par catégorie de 1er niveau (constante maintenue). Non mappé → attribut omis.
6. **Erreur DB** : HTTP 500 + `console.error` (jamais de flux partiel — Merchant Center conserve alors le dernier bon flux).
7. **Livraison** : configurée côté compte Merchant Center (zones Abidjan/COD), **pas** d'attribut `g:shipping` par produit en V1.

## Mapping des attributs (par produit)

| Attribut Google | Source / règle |
|---|---|
| `g:id` | `product.id` (identifiant stable, jamais le slug) |
| `g:title` | `name`, tronqué à 150 caractères |
| `g:description` | `short_description` sinon `stripHtml(description)` ; fallback `name` si vide ; tronqué à 5000 |
| `g:link` | `${SITE_URL}/p/${slug}` |
| `g:image_link` | image primaire (`is_primary=1`, sinon plus petit `sort_order`), URL R2 absolue via `getImageUrl` |
| `g:additional_image_link` | jusqu'à 10 autres images (hors variantes) |
| `g:availability` | `in_stock` si `stock_quantity > 0`, sinon `out_of_stock` |
| `g:price` | si `compare_price` renseigné **et** `compare_price > base_price` → `compare_price` ; sinon `base_price`. Format `"<entier> XOF"` |
| `g:sale_price` | présent uniquement si promo (`compare_price > base_price`) → `base_price XOF` |
| `g:brand` | `brand` si présent |
| `g:mpn` | `sku` si présent |
| `g:condition` | `"new"` (constante) |
| `g:identifier_exists` | `"no"` **uniquement** si `brand` ET `sku` absents |
| `g:google_product_category` | via mapping (ci-dessous) si la catégorie est mappée |
| `g:product_type` | nom de la catégorie interne (taxonomie maison) |

### Mapping `google_product_category` (slug 1er niveau → ID Google)

IDs **à vérifier** contre le fichier officiel `taxonomy-with-ids.en-US.txt` lors de l'implémentation.

| slug | Google Product Category (ID) |
|---|---|
| `smartphones` | Mobile Phones (267) |
| `tablettes` | Tablet Computers (4745) |
| `ordinateurs` | Computers (278) |
| `televiseurs`, `televisions` | Televisions (404) |
| `ecouteurs` | Headphones (29) |
| `montres-connectees` | Smart Watches *(vérifier)* |
| `imprimantes` | Printers *(vérifier)* |
| `projecteurs` | Projectors *(vérifier)* |
| `gaming` | Video Game Consoles (234) |
| `jeux` | Video Game Software (1279) |
| `reseau` | Networking *(vérifier)* |
| `accessoires` | Electronics Accessories (2082) |

Les sous-catégories (`apple`, `samsung`, `xiaomi`, `redmi`…) héritent du mapping de leur parent ; elles n'ont aucun produit direct aujourd'hui.

## Architecture (unités isolées et testables)

- **`lib/seo/merchant-feed.ts`** — fonctions pures, sans I/O :
  - `escapeXml(str): string`
  - `stripHtml(html): string` (supprime balises + décode entités courantes)
  - `formatPrice(amount): string` → `"150000 XOF"`
  - `googleCategoryFor(categorySlug, parentSlug?): number | undefined`
  - `buildFeedItem(product): string` → bloc `<item>…</item>` XML
  - `buildFeed(items: string[]): string` → enveloppe `<rss><channel>…`
- **`lib/db/products.ts`** — `getProductsForFeed()` : une requête renvoyant les colonnes nécessaires + l'image primaire + les images additionnelles (ou requête images jointe), catégorie (slug + slug parent). Réutilise `query<>()`.
- **`app/feed.xml/route.ts`** — `GET` : récupère, mappe, assemble, renvoie le XML ; `try/catch` → 500 + log.

### Type d'entrée de `buildFeedItem`
Type projeté minimal (pas l'entité complète) : `id, slug, name, description, description_type, short_description, base_price, compare_price, sku, brand, stock_quantity, category_slug, parent_category_slug, primary_image_url, additional_image_urls[]`.

## Gestion des cas limites

- Produit sans image → exclu, compté, loggé.
- `description` HTML/richtext → strip balises + entités avant insertion.
- Toutes les valeurs texte → `escapeXml`.
- `title` ≤ 150, `description` ≤ 5000.
- Prix : entiers XOF, jamais de décimale.
- `brand`/`sku` absents → omis ; les deux absents → `identifier_exists=no`.

## Tests (Vitest)

`__tests__/unit/merchant-feed.test.ts` :
- prix simple vs promo (`price`/`sale_price`) ;
- `availability` in/out selon stock ;
- `stripHtml` (balises, entités) ;
- fallback description (`short_description` → `description` → `name`) ;
- `identifier_exists=no` quand brand+sku absents ;
- sélection image primaire ;
- échappement XML (`&`, `<`, `"`…) ;
- `googleCategoryFor` (mappé, hérité du parent, non mappé → undefined).

Vérif manuelle : `curl /feed.xml` → XML bien formé, ~231 `<item>`, validation visuelle de quelques produits.

## Hors périmètre V1 (ajoutable ensuite)

- Variantes / `item_group_id` (1 entrée par variante, prix/stock/image propres).
- `g:shipping` par produit (zones/communes).
- GTIN (si codes-barres ajoutés au modèle un jour).
- Soumission/monitoring automatisé du flux via l'API Content for Shopping.

## Étapes post-livraison (manuel, hors code)

1. Créer le compte **Google Merchant Center**, valider le domaine `netereka.ci`.
2. Configurer **livraison** (zones Abidjan/COD) et **taxes** côté compte.
3. Ajouter le flux par **récupération planifiée** : `https://netereka.ci/feed.xml`.
4. Corriger les éventuels refus produits remontés par Merchant Center.
