# Spec — Contenu libre (hero + fiche produit) et retrait de l'IA embarquée

**Date :** 2026-09-13
**Statut :** Approuvé
**Périmètre :** Lot A — modèle de contenu libre, conversion de l'existant, retrait du pipeline IA embarqué

---

## Objectif

Les deux zones éditoriales de la boutique sont aujourd'hui contraintes par un schéma fermé :

- **Le hero de la page d'accueil** rend un gabarit fixe (badge, titre, sous-titre, prix, bouton) au-dessus d'un dégradé à deux couleurs. Aucune autre composition n'est possible.
- **La story de la fiche produit** impose `tagline`, puis `highlights` (3 à 6, chacun avec une icône tirée d'une liste fermée d'environ cinquante noms Hugeicons), puis `feature_blocks` (2 à 4), puis `faq` (≤ 5). Un bloc de HTML libre existe déjà à côté, mais il est rendu dans un conteneur `max-w-3xl` avec les classes `prose`, ce qui limite sa mise en page.

L'objectif est de lever ces limites : le hero et la story deviennent du HTML/CSS libre, rédigé par l'administrateur ou par une IA externe via le MCP. Dans le même mouvement, le pipeline IA embarqué dans l'administration (`/products/ai-new`, page « Config AI », clés Anthropic et Brave) est retiré — il produit précisément le schéma structuré que ce lot supprime, et l'administration doit désormais passer par le MCP.

Ce document couvre le **lot A**. La généralisation du serveur MCP (produits complets, bannières) fait l'objet du lot B, spécifié séparément.

## Décisions prises

1. **Modèle de liberté : HTML/CSS libre, image à part.** Le contenu éditorial devient un bloc HTML libre, mais `image_url` reste un champ structuré côté bannière. C'est ce qui préserve `next/image`, le preload LCP mis en cache dans KV (`hero:lcp:preload-url`) et le carrousel Embla existant. Une liberté totale incluant l'image aurait imposé de reconstruire ces trois mécanismes pour un gain éditorial marginal.
2. **L'existant est converti une fois pour toutes**, pas maintenu en cohabitation. Deux chemins de rendu et des éditeurs structurés survivants annuleraient l'intérêt du changement.
3. **Le retrait de l'IA embarquée appartient à ce lot**, pas à un chantier ultérieur : dès que la story structurée disparaît, `actions/admin/products-ai.ts` écrit dans des colonnes mortes.
4. **Suppression de colonnes différée.** Les colonnes devenues inutiles restent en base (phase *expand*) et seront retirées par une migration *contract* ultérieure. `scripts/check-migration-safety.mjs` bloque `DROP COLUMN` en pre-commit et en CI, et le pipeline canary fait tourner deux versions du code simultanément : supprimer une colonne dans la même migration casserait la version encore déployée.

## 1. Modèle de données

### 1.1 Produits

Le contenu long de la fiche devient `description` + `description_type = "html"`, c'est-à-dire le bloc libre qui existe déjà. Aucune colonne n'est ajoutée.

Passent en legacy, conservées en base jusqu'au *contract* : `tagline`, `highlights`, `feature_blocks`, `faq`.

### 1.2 Bannières

Une colonne est ajoutée :

```ts
content_html: text("content_html"),
```

Restent structurés et pleinement utilisés :

- `image_url` — rendu par `next/image`, alimente le preload LCP ;
- `link_url` — la slide entière reste cliquable ;
- `title` — obligatoire, sert à identifier la bannière dans l'administration et alimente `alt` / `aria-label` ;
- `display_order`, `is_active`, `starts_at`, `ends_at` — ordonnancement, activation, planification ;
- `bg_gradient_from`, `bg_gradient_to` — le fond reste rendu en React, sous le HTML libre.

Passent en legacy, conservés jusqu'au *contract* : `subtitle`, `badge_text`, `badge_color`, `cta_text`, `price`.

### 1.3 Migration

Une seule migration Drizzle en phase *expand* : `ALTER TABLE banners ADD COLUMN content_html TEXT`. Workflow habituel — éditer `lib/db/schema.ts`, `npm run db:generate`, relire le SQL produit dans `drizzle/`, `npm run db:migrate`, committer `schema.ts` + `drizzle/*.sql` + `drizzle/meta/`.

La migration *contract* qui supprimera `tagline`, `highlights`, `feature_blocks`, `faq`, les cinq colonnes legacy de `banners` et la table `ai_config` est **hors périmètre** de ce lot. Elle devra porter le marqueur `-- migration-safety: acknowledged reason="..."` et n'être appliquée qu'après promotion à 100 % de la version qui cesse de lire ces colonnes.

## 2. Conversion de l'existant

Un script `scripts/convert-content-to-html.mjs`, exécutable contre D1 local puis distant, **idempotent et rejouable**.

### 2.1 Produits

Pour chaque produit dont au moins un champ story est renseigné, le script agrège en un seul document HTML, dans l'ordre de rendu actuel : la `tagline`, les `highlights`, les `feature_blocks`, la `faq`, puis la description existante. Le résultat est écrit dans `description` avec `description_type = 'html'`, et les quatre colonnes story sont mises à `NULL`.

Vider ces colonnes n'est pas un détail : c'est ce qui rend la conversion compatible avec le déploiement canary (§ 2.4) et ce qui donne au script son marqueur d'idempotence. La donnée d'origine n'est récupérable que par l'export D1 pris juste avant l'exécution distante — cet export est une étape obligatoire du runbook, pas une précaution facultative.

Les icônes Hugeicons des `highlights` sont des composants React ; elles sont résolues en SVG inline à partir de `@hugeicons/core-free-icons`, en réutilisant la table de correspondance de `components/storefront/product-story/icons.ts` avant sa suppression. Une icône introuvable est omise sans faire échouer la conversion, et signalée dans le rapport.

**Le scoping CSS est persisté à l'écriture**, pas au rendu : `sanitizeDescriptionHtml(html, productId)` préfixe les sélecteurs des blocs `<style>` par `.desc-<productId>` et c'est cette forme préfixée qui est stockée. Le script doit donc repasser le document agrégé par le sanitizer avec le bon identifiant, et ne jamais re-préfixer une règle déjà préfixée — `isAlreadyScoped()` s'en charge, à condition de passer le même identifiant qu'à l'écriture d'origine.

Un produit dont `description_type` vaut déjà `"html"` et dont les quatre colonnes story sont vides est ignoré : c'est ce qui rend le script rejouable.

### 2.2 Bannières

Pour chaque bannière dont `content_html` est vide, le script rend le gabarit actuel — badge, titre, sous-titre, prix formaté, libellé du bouton — en HTML équivalent, repris de `components/storefront/hero-banner.tsx` afin que l'aspect ne change pas, et l'écrit dans `content_html`. Le HTML passe par le sanitizer avec l'identifiant de portée `banner-<id>`.

### 2.3 Rapport

Le script écrit une ligne par enregistrement traité : identifiant, action (converti / ignoré / échec), et pour les produits la liste des icônes non résolues. Il n'écrit rien tant que l'agrégation d'un enregistrement échoue — l'enregistrement est signalé et laissé intact.

### 2.4 Séquencement de déploiement

Le pipeline déploie en canary : deux versions du code servent le trafic simultanément. La conversion doit donc s'intercaler entre deux déploiements, et non accompagner l'un d'eux.

1. **Déploiement 1** — la migration *expand* ajoutant `content_html`, et une seule modification de rendu : le hero lit `content_html` quand il est renseigné, sinon il rend le gabarit actuel. Rien d'autre ne change ; aucun effet visible.
2. **Conversion** — export D1 distant, puis exécution du script contre le distant, une fois le déploiement 1 promu à 100 %. Pendant et après, les deux chemins de rendu restent corrects : l'ancienne version affiche `description` (qui contient désormais toute la story) et des blocs story vides ; le hero affiche `content_html`.
3. **Déploiement 2** — suppression des composants story structurés, du repli gabarit du hero, des éditeurs admin correspondants, du pipeline IA, et élagage du contrat MCP.
4. **Plus tard** — migration *contract*.

Le repli gabarit du hero introduit au déploiement 1 est une béquille de transition, supprimée au déploiement 2. C'est la seule entorse à la décision 2.

## 3. Rendu storefront

### 3.1 Sanitizer

`sanitizeDescriptionHtml(html, productId?)` est généralisé : le second paramètre devient `scopeId` et conserve exactement le même comportement — le préfixe émis reste `.desc-<scopeId>`. Les bannières passent `banner-<id>`, ce qui produit `.desc-banner-12` et ne peut entrer en collision avec un identifiant produit. Aucun changement de format sur les données déjà stockées, donc aucune reprise.

### 3.2 Fiche produit

`components/storefront/product-story/` se réduit à `StoryFreeContent`. Sont supprimés : `story-tagline.tsx`, `story-highlights.tsx`, `story-feature-block.tsx`, `story-faq.tsx`, `icons.ts`, et les props correspondantes de `index.tsx` et `components/storefront/product-details.tsx`.

`StoryFreeContent` perd son conteneur contraignant : le `mx-auto max-w-3xl px-6` et les classes `prose` disparaissent quand `description_type === "html"`. Le contenu est rendu pleine largeur et c'est l'auteur du HTML qui décide de sa propre mise en page. Le rendu `richtext` conserve le conteneur `prose` actuel — c'est ce qui le rend lisible sans effort de mise en forme.

### 3.3 Hero

`hero-banner.tsx` garde son carrousel Embla, son autoplay, son dégradé et son `next/image`. Le contenu textuel du gabarit est remplacé par `content_html`, injecté via `dangerouslySetInnerHTML` — le HTML a été assaini au moment de l'écriture, jamais au rendu, ce qui évite de faire tourner le sanitizer dans un composant client. Quand `content_html` est vide, la slide n'affiche que l'image et le dégradé.

Le repli sur les produits en vedette (`buildSlides` quand aucune bannière n'est active) reste un gabarit React : c'est notre propre code, pas du contenu éditorial, et rien ne justifie de le faire transiter par une chaîne HTML.

## 4. Administration

`components/admin/banner-form.tsx` reçoit l'éditeur CodeMirror HTML/CSS déjà utilisé pour les descriptions produit (`components/admin/description-editor.tsx` et son `HtmlEditor`), avec son aperçu en iframe sandboxée. `components/admin/banner-preview.tsx` est adapté pour afficher `content_html`.

Les onglets « Éditeur riche » et « HTML » de la description produit sont conservés : le richtext reste le chemin court pour du texte simple, et `description_type` continue d'arbitrer le rendu.

Sont supprimés : `components/admin/product-story-section.tsx`, `components/admin/story-feature-block-editor.tsx`, `components/admin/story-icon-picker.tsx`, ainsi que l'étape story du wizard produit et les champs story de `components/admin/product-form-sections.tsx` et `components/admin/product-wizard/step-finalization.tsx`.

## 5. Retrait de l'IA embarquée

**Supprimés :**

- `app/(admin)/products/ai-new/` (page et client)
- `app/api/admin/products-ai/`
- `actions/admin/products-ai.ts`
- `app/(admin)/ai-settings/`
- `components/admin/ai/`
- `lib/ai/client.ts`, `config.ts`, `product-research.ts`, `image-search.ts`, `image-vision-filter.ts`, `submit-tool-schema.ts`, `rate-limit.ts`
- l'entrée « Config AI » de `components/admin/sidebar.tsx` et le bouton de création assistée de `app/(admin)/products/products-page-client.tsx`
- les suites de test correspondantes sous `__tests__/unit/ai/` et `__tests__/unit/actions/products-ai.test.ts`

**Conservés :**

- `lib/ai/image-fetch.ts` → déplacé en `lib/storage/fetch-image.ts`. Le MCP s'en sert pour `add_product_images` ; il porte la garde SSRF, la limite de 5 Mo, le timeout de 10 s et le suivi sûr des redirections. Son test suit le déplacement. La construction de clé `products/<id>/<nanoid>.<ext>` y est codée en dur : elle reste inchangée dans ce lot, le lot B la généralisera pour les bannières.
- `lib/rate-limit/kv-window-limit.ts` — utilisé par `lib/rate-limit/orders.ts`, `csp-report.ts` et `promo.ts`. Seul `lib/ai/rate-limit.ts`, spécifique à l'IA, est retiré.
- La table `ai_config` et son entrée dans `lib/db/schema.ts` restent en place jusqu'au *contract*.

Les variables d'environnement de clés Anthropic et Brave cessent d'être lues. Elles ne sont pas retirées de `env.d.ts` dans ce lot, pour ne pas casser un déploiement dont les secrets sont encore définis.

## 6. Contrecoup sur le serveur MCP existant

Les outils MCP déjà en production acceptent `story { tagline, highlights, feature_blocks, faq }` et écrivent les quatre colonnes. Une fois celles-ci déclassées, ces écritures seraient silencieusement perdues. Ce lot doit donc :

- retirer `storyInputSchema` et le champ `story` de `lib/validations/mcp-product.ts` ;
- retirer l'écriture des colonnes story de `buildProductColumns()` dans `lib/db/product-drafts.ts` et le champ `story` de `getDraft()` ;
- mettre à jour `DESCRIPTION_RULES` dans `lib/mcp/tools/products.ts`, qui documente le contrat aux clients IA.

Les imports de `lib/validations/product-story.ts` disparaissent ; le fichier est supprimé avec les éditeurs qui le consommaient.

## 7. Tests

- **Sanitizer** — le préfixe de portée fonctionne avec un identifiant de bannière ; une règle déjà préfixée n'est pas préfixée deux fois.
- **Script de conversion** — story complète, story partielle, story vide, icône inconnue, produit déjà en HTML (ignoré), et rejouabilité : deux exécutions successives produisent le même résultat.
- **Hero** — rendu avec `content_html`, sans `content_html`, et repli sur les produits en vedette.
- **Story produit** — rendu pleine largeur en `html`, conteneur `prose` conservé en `richtext`, rendu nul quand la description est vide.
- **Non-régression** — `__tests__/unit/actions/admin-banners.test.ts` et les tests du wizard produit passent après élagage. `__tests__/unit/lib/db/product-drafts.test.ts` et `__tests__/unit/lib/validations/mcp-product.test.ts` sont amputés de leurs cas story.
- Le hook de pre-commit (`tsc --noEmit`, `eslint`, `vitest run`) doit passer avant tout commit.

## 8. Risques

**Une conversion infidèle passe inaperçue.** Le rapport ligne par ligne du script est le garde-fou : la conversion est relue produit par produit en local, sur une base synchronisée avec `npm run db:sync`, avant d'être rejouée en distant.

**Du HTML libre casse la mise en page mobile.** Le conteneur contraignant disparaît par conception. Le gabarit converti reste responsive puisqu'il reprend le balisage actuel, mais tout contenu rédigé ensuite engage son auteur. L'aperçu de l'éditeur admin est le point de contrôle.

**Le preload LCP dépend d'`image_url`.** Il est préservé parce que l'image reste un champ structuré ; `refreshHeroPreload()` n'est pas modifié par ce lot.

## Hors périmètre

- La généralisation du serveur MCP aux produits publiés et aux bannières (lot B).
- La migration *contract* supprimant les colonnes legacy et la table `ai_config`.
- La migration de `actions/admin/products.ts` de SQL brut vers Drizzle.
- Le retrait des variables d'environnement Anthropic et Brave de `env.d.ts`.
