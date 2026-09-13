# Spec — Contenu libre (hero + fiche produit) et retrait de l'IA embarquée

**Date :** 2026-09-13
**Statut :** Approuvé
**Périmètre :** Lot A — modèle de contenu libre, conversion de l'existant, retrait du pipeline IA embarqué

---

## Objectif

Les deux zones éditoriales de la boutique sont aujourd'hui contraintes par un schéma fermé :

- **Le hero de la page d'accueil** rend un gabarit fixe (badge, titre, sous-titre, prix, bouton) au-dessus d'un dégradé à deux couleurs. Aucune autre composition n'est possible.
- **La story de la fiche produit** impose `tagline`, puis `highlights` (3 à 6, chacun avec une icône tirée d'une liste fermée d'environ cinquante noms Hugeicons), puis `feature_blocks` (2 à 4), puis `faq` (≤ 5). Un bloc de HTML libre existe déjà à côté, mais il est rendu dans un conteneur `max-w-3xl` avec les classes `prose`, ce qui limite sa mise en page.

L'objectif est de lever ces limites : le hero et la story deviennent du HTML/CSS libre, rédigé par l'administrateur ou par une IA externe via le MCP. Cette liberté est encadrée — un vocabulaire de classes bâti sur les tokens existants et un contrôle qui signale les écarts — pour que la composition soit libre sans que l'harmonie visuelle du site se disperse. Dans le même mouvement, le pipeline IA embarqué dans l'administration (`/products/ai-new`, page « Config AI », clés Anthropic et Brave) est retiré — il produit précisément le schéma structuré que ce lot supprime, et l'administration doit désormais passer par le MCP.

Ce document couvre le **lot A**. La généralisation du serveur MCP (produits complets, bannières) fait l'objet du lot B, spécifié séparément.

## Décisions prises

1. **Modèle de liberté : HTML/CSS libre, image à part.** Le contenu éditorial devient un bloc HTML libre, mais `image_url` reste un champ structuré côté bannière. C'est ce qui préserve `next/image`, le preload LCP mis en cache dans KV (`hero:lcp:preload-url`) et le carrousel Embla existant. Une liberté totale incluant l'image aurait imposé de reconstruire ces trois mécanismes pour un gain éditorial marginal.
2. **L'existant est converti une fois pour toutes**, pas maintenu en cohabitation. Deux chemins de rendu et des éditeurs structurés survivants annuleraient l'intérêt du changement.
3. **Le retrait de l'IA embarquée appartient à ce lot**, pas à un chantier ultérieur : dès que la story structurée disparaît, `actions/admin/products-ai.ts` écrit dans des colonnes mortes.
4. **L'encadrement du contenu libre est posé dans ce lot, pas dans le lot B.** Le script de conversion est le premier auteur de contenu libre du site : un vocabulaire visuel défini après lui obligerait à reconvertir tout le corpus. Il avertit sans refuser — un refus reproduirait, un cran plus loin, la rigidité que ce lot supprime.
5. **La fiche produit s'organise en quatre onglets** — Description, Détails produit, Avis, FAQ — inspirés de la page de référence `tradingshenzhen.com`. L'onglet est le cadre, son contenu reste libre : la structure en onglets n'est pas un retour au schéma fermé, elle donne au contenu libre une place identifiable. L'onglet « Questions » de la référence est écarté : il suppose une modération de questions clients qui n'existe pas ici.
6. **La FAQ revient en contenu libre**, dans une colonne `faq_html` propre, et non en JSON structuré. L'accordéon se fait en `<details>` / `<summary>` natifs, sans JavaScript. L'argument SEO qui aurait justifié le JSON ne tient plus : Google a restreint les rich results `FAQPage` aux sites gouvernementaux et de santé en 2023, et la boutique n'émet aujourd'hui aucun `FAQPage`.
7. **Les images viennent d'une recherche puis d'une génération**, dans cet ordre, et la génération se fait en **mode édition** : la photo réelle du produit est l'image source, le modèle compose le contexte autour d'elle. Ce n'est pas un compromis mais la garantie centrale — sur une boutique en paiement à la livraison, un visuel qui ne correspond pas à ce qui est livré se paie en refus de colis. Le moteur retenu est `grok-imagine-image-2.0` de xAI, qui accepte une image source et jusqu'à cinq sources pour composer une scène. L'outillage appartient au lot B ; le lot A se contente de ne pas supprimer ce qui servira.
8. **Suppression de colonnes différée.** Les colonnes devenues inutiles restent en base (phase *expand*) et seront retirées par une migration *contract* ultérieure. `scripts/check-migration-safety.mjs` bloque `DROP COLUMN` en pre-commit et en CI, et le pipeline canary fait tourner deux versions du code simultanément : supprimer une colonne dans la même migration casserait la version encore déployée.

## 1. Modèle de données

### 1.1 Produits

Le contenu de l'onglet Description devient `description` + `description_type = "html"`, c'est-à-dire le bloc libre qui existe déjà.

Une colonne est ajoutée pour l'onglet FAQ :

```ts
faq_html: text("faq_html"),
```

Les attributs du produit (`product_attributes`) alimentent l'onglet Détails produit et les avis (`reviews`) l'onglet Avis : les deux existent déjà et ne changent pas.

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

Une seule migration Drizzle en phase *expand*, ajoutant deux colonnes : `banners.content_html` et `products.faq_html`. Workflow habituel — éditer `lib/db/schema.ts`, `npm run db:generate`, relire le SQL produit dans `drizzle/`, `npm run db:migrate`, committer `schema.ts` + `drizzle/*.sql` + `drizzle/meta/`.

La migration *contract* qui supprimera `tagline`, `highlights`, `feature_blocks`, `faq`, les cinq colonnes legacy de `banners` et la table `ai_config` est **hors périmètre** de ce lot. Elle devra porter le marqueur `-- migration-safety: acknowledged reason="..."` et n'être appliquée qu'après promotion à 100 % de la version qui cesse de lire ces colonnes.

## 2. Encadrement du contenu libre

La liberté de composition ne doit pas se payer en dispersion visuelle. Le principe retenu : **la liberté porte sur la composition, la cohérence sur les atomes**. Il ne s'agit pas d'inventer un design system — `app/globals.css` porte déjà un jeu complet de tokens oklch avec variantes claire et sombre (`--primary`, `--muted`, `--card`, `--radius`, `--font-sans`…) — mais de le rendre utilisable depuis du HTML brut.

### 2.1 Vocabulaire de classes

Un `@layer` dédié de `app/globals.css` expose un jeu de classes préfixées `nk-`, construites exclusivement sur les tokens existants et responsives par construction :

- rythme vertical et pleine largeur — `nk-section`, `nk-section-alt` (fond `--muted`), `nk-container` (largeur de lecture confortable pour les blocs de texte) ;
- mise en grille — `nk-grid` (colonnes automatiques, s'effondre en une colonne sous 640 px), `nk-split` (deux colonnes texte / media) ;
- contenu — `nk-lead` (chapô), `nk-card`, `nk-media` (image avec `border-radius: var(--radius)`), `nk-specs` (liste clé / valeur), `nk-quote`, `nk-cta` ;
- FAQ — `nk-faq`, qui habille une suite de `<details>` / `<summary>` en accordéon sans JavaScript.

Chaque classe est documentée en commentaire dans le même fichier, avec un exemple minimal. C'est cette documentation que le lot B reprendra pour la transmettre au client IA.

Le `@layer` se place après `base` et avant `utilities`. Une règle écrite par l'auteur dans son propre bloc `<style>` — déjà préfixée `.desc-<scopeId>` par le sanitizer, donc plus spécifique — l'emporte toujours. **Le vocabulaire propose, il n'impose pas** : c'est ce qui le distingue du schéma fermé qu'on retire.

### 2.2 Contrôle à l'écriture

`lib/content/check-design-conformance.ts` inspecte un document HTML et retourne la liste des écarts, chacun localisé et assorti d'une suggestion :

- couleur littérale (`#rrggbb`, `rgb()`, `hsl()`) là où un token existe ;
- taille de police en `px` plutôt qu'en unité relative ;
- largeur ou hauteur fixe en `px` sur un conteneur ;
- `position: fixed`, `z-index` élevé, `!important` ;
- image sans attribut `alt`.

**Le contrôle avertit, il ne refuse jamais.** Un écart n'empêche pas l'enregistrement. Deux raisons : le vocabulaire ne peut pas anticiper tout cas légitime, et un blocage à l'écriture recréerait la contrainte que ce lot supprime. La dérive est rendue visible, pas interdite.

Le module vit dans `lib/`, sans dépendance à React ni au DOM, pour que l'éditeur admin (§ 5) et les outils MCP du lot B l'appellent tous les deux.

### 2.3 Ce qui revient au lot B

Le lot B n'étend pas l'encadrement, il l'enseigne : la documentation du vocabulaire est reprise dans la description des outils MCP d'écriture de contenu, et les écarts relevés par le contrôle sont renvoyés dans la réponse de ces outils, pour que le client IA se corrige de lui-même sans aller-retour humain.

## 3. Conversion de l'existant

Un script `scripts/convert-content-to-html.mjs`, exécutable contre D1 local puis distant, **idempotent et rejouable**.

### 3.1 Produits

Pour chaque produit dont au moins un champ story est renseigné, le script agrège en un seul document HTML, dans l'ordre de rendu actuel : la `tagline`, les `highlights`, les `feature_blocks`, puis la description existante. La `faq` ne rejoint pas ce document : elle est convertie à part en une suite de `<details>` / `<summary>` écrite dans `faq_html`, puisqu'elle a désormais son propre onglet. Le markup produit emploie le vocabulaire de la § 2.1 — `nk-section` pour le rythme, `nk-grid` pour les highlights, `nk-card` pour les blocs, `nk-specs` pour les listes clé / valeur — et non un balisage ad hoc : c'est ce qui fait de la conversion le premier corpus conforme à la charte. Le résultat est écrit dans `description` avec `description_type = 'html'`, et les quatre colonnes story sont mises à `NULL`.

La conversion de la `faq` suit la même règle : écrite dans `faq_html`, la colonne `faq` est vidée.

Vider ces colonnes n'est pas un détail : c'est ce qui rend la conversion compatible avec le déploiement canary (§ 3.4) et ce qui donne au script son marqueur d'idempotence. La donnée d'origine n'est récupérable que par l'export D1 pris juste avant l'exécution distante — cet export est une étape obligatoire du runbook, pas une précaution facultative.

Les icônes Hugeicons des `highlights` sont des composants React ; elles sont résolues en SVG inline à partir de `@hugeicons/core-free-icons`, en réutilisant la table de correspondance de `components/storefront/product-story/icons.ts` avant sa suppression. Une icône introuvable est omise sans faire échouer la conversion, et signalée dans le rapport.

**Le scoping CSS est persisté à l'écriture**, pas au rendu : `sanitizeDescriptionHtml(html, productId)` préfixe les sélecteurs des blocs `<style>` par `.desc-<productId>` et c'est cette forme préfixée qui est stockée. Le script doit donc repasser le document agrégé par le sanitizer avec le bon identifiant, et ne jamais re-préfixer une règle déjà préfixée — `isAlreadyScoped()` s'en charge, à condition de passer le même identifiant qu'à l'écriture d'origine.

Un produit dont `description_type` vaut déjà `"html"` et dont les quatre colonnes story sont vides est ignoré : c'est ce qui rend le script rejouable.

### 3.2 Bannières

Pour chaque bannière dont `content_html` est vide, le script rend le gabarit actuel — badge, titre, sous-titre, prix formaté, libellé du bouton — en HTML équivalent, repris de `components/storefront/hero-banner.tsx` afin que l'aspect ne change pas, et l'écrit dans `content_html`, également dans le vocabulaire de la § 2.1. Le HTML passe par le sanitizer avec l'identifiant de portée `banner-<id>`.

### 3.3 Rapport

Le script écrit une ligne par enregistrement traité : identifiant, action (converti / ignoré / échec), et pour les produits la liste des icônes non résolues. Il n'écrit rien tant que l'agrégation d'un enregistrement échoue — l'enregistrement est signalé et laissé intact.

### 3.4 Séquencement de déploiement

Le pipeline déploie en canary : deux versions du code servent le trafic simultanément. La conversion doit donc s'intercaler entre deux déploiements, et non accompagner l'un d'eux.

1. **Déploiement 1** — la migration *expand* ajoutant `content_html`, et une seule modification de rendu : le hero lit `content_html` quand il est renseigné, sinon il rend le gabarit actuel. Rien d'autre ne change ; aucun effet visible.
2. **Conversion** — export D1 distant, puis exécution du script contre le distant, une fois le déploiement 1 promu à 100 %. Pendant et après, les deux chemins de rendu restent corrects : l'ancienne version affiche `description` (qui contient désormais toute la story) et des blocs story vides ; le hero affiche `content_html`.
3. **Déploiement 2** — suppression des composants story structurés, du repli gabarit du hero, des éditeurs admin correspondants, du pipeline IA, et élagage du contrat MCP.
4. **Plus tard** — migration *contract*.

Le repli gabarit du hero introduit au déploiement 1 est une béquille de transition, supprimée au déploiement 2. C'est la seule entorse à la décision 2.

## 4. Rendu storefront

### 4.1 Sanitizer

`details` et `summary` rejoignent `ALLOWED_TAGS` de `lib/utils/sanitize-html.ts` — sans eux l'accordéon FAQ est impossible en contenu libre. Ce sont des éléments purement déclaratifs, sans surface d'exécution : l'ajout n'ouvre aucun vecteur. L'attribut `open` est également autorisé.

`sanitizeDescriptionHtml(html, productId?)` est généralisé : le second paramètre devient `scopeId` et conserve exactement le même comportement — le préfixe émis reste `.desc-<scopeId>`. Les bannières passent `banner-<id>`, ce qui produit `.desc-banner-12` et ne peut entrer en collision avec un identifiant produit. Aucun changement de format sur les données déjà stockées, donc aucune reprise.

### 4.2 Onglets de la fiche produit

`components/storefront/product-details.tsx` passe de deux onglets (Description, Caractéristiques) à quatre :

| Onglet | Source |
| --- | --- |
| Description | `description` en contenu libre |
| Détails produit | `product_attributes`, rendu par l'`AttributesTable` existante |
| Avis | `getProductRatingStats` + `getProductReviews`, déjà écrits |
| FAQ | `faq_html` en contenu libre |

Les avis sont aujourd'hui rendus par `ProductReviews`, un composant serveur asynchrone placé sous les onglets dans `app/(storefront)/p/[slug]/page.tsx`. Il ne peut pas être appelé depuis l'intérieur de `Tabs`, qui est un composant client. `ProductDetails` reçoit donc un prop `reviews: React.ReactNode` et la page lui passe son `<Suspense>` existant — le streaming des avis est préservé, le composant n'est pas réécrit.

`ProductReviews` retourne `null` quand aucun avis n'existe ; dans une structure à onglets cela laisserait un onglet vide. L'onglet Avis reste toujours présent et affiche un état vide invitant au premier avis. Un onglet dont la source est vide — FAQ sans `faq_html`, Détails sans attributs — n'est pas affiché.

### 4.3 Contenu de l'onglet Description

`components/storefront/product-story/` se réduit à `StoryFreeContent`. Sont supprimés : `story-tagline.tsx`, `story-highlights.tsx`, `story-feature-block.tsx`, `story-faq.tsx`, `icons.ts`, et les props correspondantes de `index.tsx` et `components/storefront/product-details.tsx`.

`StoryFreeContent` perd son conteneur contraignant : le `mx-auto max-w-3xl px-6` et les classes `prose` disparaissent quand `description_type === "html"`. Le contenu est rendu pleine largeur et c'est l'auteur du HTML qui décide de sa propre mise en page — `nk-container` lui rend la largeur de lecture confortable quand il la veut, au lieu de la lui imposer. Le rendu `richtext` conserve le conteneur `prose` actuel — c'est ce qui le rend lisible sans effort de mise en forme.

### 4.4 Hero

`hero-banner.tsx` garde son carrousel Embla, son autoplay, son dégradé et son `next/image`. Le contenu textuel du gabarit est remplacé par `content_html`, injecté via `dangerouslySetInnerHTML` — le HTML a été assaini au moment de l'écriture, jamais au rendu, ce qui évite de faire tourner le sanitizer dans un composant client. Quand `content_html` est vide, la slide n'affiche que l'image et le dégradé.

Le repli sur les produits en vedette (`buildSlides` quand aucune bannière n'est active) reste un gabarit React : c'est notre propre code, pas du contenu éditorial, et rien ne justifie de le faire transiter par une chaîne HTML.

## 5. Administration

`components/admin/banner-form.tsx` reçoit l'éditeur CodeMirror HTML/CSS déjà utilisé pour les descriptions produit (`components/admin/description-editor.tsx` et son `HtmlEditor`), avec son aperçu en iframe sandboxée. `components/admin/banner-preview.tsx` est adapté pour afficher `content_html`.

Les deux éditeurs HTML — description produit et bannière — affichent sous l'aperçu les écarts remontés par `check-design-conformance` (§ 2.2), chacun avec sa ligne et sa suggestion. Ce sont des avertissements : l'enregistrement reste possible.

Les onglets « Éditeur riche » et « HTML » de la description produit sont conservés : le richtext reste le chemin court pour du texte simple, et `description_type` continue d'arbitrer le rendu.

Sont supprimés : `components/admin/product-story-section.tsx`, `components/admin/story-feature-block-editor.tsx`, `components/admin/story-icon-picker.tsx`, ainsi que l'étape story du wizard produit et les champs story de `components/admin/product-form-sections.tsx` et `components/admin/product-wizard/step-finalization.tsx`.

## 6. Retrait de l'IA embarquée

**Supprimés :**

- `app/(admin)/products/ai-new/` (page et client)
- `app/api/admin/products-ai/`
- `actions/admin/products-ai.ts`
- `app/(admin)/ai-settings/`
- `components/admin/ai/`
- `lib/ai/client.ts`, `config.ts`, `product-research.ts`, `image-vision-filter.ts`, `submit-tool-schema.ts`, `rate-limit.ts`
- l'entrée « Config AI » de `components/admin/sidebar.tsx` et le bouton de création assistée de `app/(admin)/products/products-page-client.tsx`
- les suites de test correspondantes sous `__tests__/unit/ai/` et `__tests__/unit/actions/products-ai.test.ts`

**Conservés :**

- `lib/ai/image-fetch.ts` → déplacé en `lib/storage/fetch-image.ts`. Le MCP s'en sert pour `add_product_images` ; il porte la garde SSRF, la limite de 5 Mo, le timeout de 10 s et le suivi sûr des redirections. Son test suit le déplacement. La construction de clé `products/<id>/<nanoid>.<ext>` y est codée en dur : elle reste inchangée dans ce lot, le lot B la généralisera pour les bannières.
- `lib/rate-limit/kv-window-limit.ts` — utilisé par `lib/rate-limit/orders.ts`, `csp-report.ts` et `promo.ts`. Seul `lib/ai/rate-limit.ts`, spécifique à l'IA, est retiré.
- `lib/ai/image-search.ts` → déplacé en `lib/media/image-search.ts`. La recherche d'images survit au retrait parce qu'elle ancre le modèle dans le réel (décision 7) ; le lot B la branchera sur un outil MCP. Elle lit aujourd'hui sa clé Brave depuis `ai_config` — elle lira désormais le secret `BRAVE_API_KEY`, ce qui la détache de la table condamnée.
- La table `ai_config` et son entrée dans `lib/db/schema.ts` restent en place jusqu'au *contract*.

`lib/ai/image-vision-filter.ts` est supprimé sans remplacement, et c'est un gain, pas une perte. Il existait parce que le pipeline embarqué devait juger seul la pertinence des résultats Brave : il envoyait chaque vignette à Claude en vision, via la clé Anthropic de `ai_config`. Avec le MCP, le client **est** le modèle — l'outil de recherche lui rend les vignettes et sa propre vision les juge. Le filtre serveur disparaît, et avec lui la dernière raison de conserver une clé Anthropic côté boutique.

Les variables d'environnement de clés Anthropic et Brave cessent d'être lues. Elles ne sont pas retirées de `env.d.ts` dans ce lot, pour ne pas casser un déploiement dont les secrets sont encore définis.

## 7. Contrecoup sur le serveur MCP existant

Les outils MCP déjà en production acceptent `story { tagline, highlights, feature_blocks, faq }` et écrivent les quatre colonnes. Une fois celles-ci déclassées, ces écritures seraient silencieusement perdues. Ce lot doit donc :

- retirer `storyInputSchema` et le champ `story` de `lib/validations/mcp-product.ts` ;
- retirer l'écriture des colonnes story de `buildProductColumns()` dans `lib/db/product-drafts.ts` et le champ `story` de `getDraft()` ;
- mettre à jour `DESCRIPTION_RULES` dans `lib/mcp/tools/products.ts`, qui documente le contrat aux clients IA.

Les imports de `lib/validations/product-story.ts` disparaissent ; le fichier est supprimé avec les éditeurs qui le consommaient.

## 8. Tests

- **Sanitizer** — le préfixe de portée fonctionne avec un identifiant de bannière ; une règle déjà préfixée n'est pas préfixée deux fois.
- **Contrôle de conformité** — chaque catégorie d'écart est détectée et localisée ; un document conforme ne remonte rien ; un document non conforme n'est jamais rejeté, seulement signalé.
- **Vocabulaire** — le HTML produit par le script de conversion ne remonte aucun écart, ce qui verrouille la cohérence entre § 2.1 et § 3.
- **Script de conversion** — story complète, story partielle, story vide, icône inconnue, produit déjà en HTML (ignoré), et rejouabilité : deux exécutions successives produisent le même résultat.
- **Hero** — rendu avec `content_html`, sans `content_html`, et repli sur les produits en vedette.
- **Story produit** — rendu pleine largeur en `html`, conteneur `prose` conservé en `richtext`, rendu nul quand la description est vide.
- **Onglets** — les quatre onglets s'affichent quand leurs sources sont renseignées ; un onglet dont la source est vide n'est pas rendu ; l'onglet Avis reste présent et affiche son état vide quand aucun avis n'existe ; les avis passés en `ReactNode` sont bien rendus dans leur onglet.
- **FAQ** — `<details>` / `<summary>` survivent au sanitizer ; la conversion d'une `faq` JSON produit un accordéon conforme au vocabulaire.
- **Non-régression** — `__tests__/unit/actions/admin-banners.test.ts` et les tests du wizard produit passent après élagage. `__tests__/unit/lib/db/product-drafts.test.ts` et `__tests__/unit/lib/validations/mcp-product.test.ts` sont amputés de leurs cas story.
- Le hook de pre-commit (`tsc --noEmit`, `eslint`, `vitest run`) doit passer avant tout commit.

## 9. Risques

**Une conversion infidèle passe inaperçue.** Le rapport ligne par ligne du script est le garde-fou : la conversion est relue produit par produit en local, sur une base synchronisée avec `npm run db:sync`, avant d'être rejouée en distant.

**Du HTML libre casse la mise en page mobile.** Le conteneur contraignant disparaît par conception. Le gabarit converti reste responsive puisqu'il reprend le balisage actuel, mais tout contenu rédigé ensuite engage son auteur. L'aperçu de l'éditeur admin est le point de contrôle.

**Le preload LCP dépend d'`image_url`.** Il est préservé parce que l'image reste un champ structuré ; `refreshHeroPreload()` n'est pas modifié par ce lot.

## Hors périmètre

- La généralisation du serveur MCP aux produits publiés et aux bannières, et la transmission du vocabulaire au client IA (lot B, § 2.3).
- **Le pipeline d'images du lot B** : un outil de recherche adossé à `lib/media/image-search.ts`, puis un outil de génération sur `grok-imagine-image-2.0` (xAI).

  Le binding `AI` de Cloudflare a été écarté : ses modèles modernes (Flux 2, Lucid Origin, Phoenix) sont text-to-image uniquement, et les seuls acceptant une image en entrée — `stable-diffusion-v1-5-img2img`, `stable-diffusion-v1-5-inpainting` — ont un rendu de 2022. Le mode édition, qui est le cœur de la décision 7, n'y est pas atteignable.

  L'API xAI accepte l'image source en **URL publique** ou en base64. C'est ce qui rend l'enchaînement direct : l'outil de recherche rend des URL, elles partent telles quelles en source de génération, sans passage par R2. Jusqu'à cinq sources peuvent être combinées — de quoi poser le produit réel dans une scène, ou aligner une bannière sur la charte à partir d'un visuel de référence.

  Trois points restent à trancher au lot B.

  **Provenance de l'image source.** Envoyer une URL trouvée au hasard du web à un modèle pour en tirer un dérivé n'est pas neutre. La source doit être, par ordre de préférence : une image déjà dans R2 pour ce produit, une image de presse du fabricant, et seulement ensuite un résultat de recherche.

  **Secret.** `XAI_API_KEY` vit comme secret Wrangler, jamais dans la table `ai_config` — celle-ci reste condamnée, le retrait de l'IA embarquée n'est pas rouvert par ce choix.

  **Latence.** Un appel d'outil MCP est un aller-retour HTTP synchrone. À mesurer avant d'arrêter le contrat des outils : si la génération dépasse la trentaine de secondes, il faudra un outil qui lance et un second qui récupère.

  Coût, pour mémoire : 0,04 $ par image en `grok-imagine-image-2.0`, et une édition est facturée sur l'image d'entrée **et** l'image de sortie.
- La migration *contract* supprimant les colonnes legacy et la table `ai_config`.
- La migration de `actions/admin/products.ts` de SQL brut vers Drizzle.
- Le retrait des variables d'environnement Anthropic et Brave de `env.d.ts`.
