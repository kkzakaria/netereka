# Lot A — Contenu libre et retrait de l'IA embarquée : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le hero à gabarit fixe et la story produit structurée par du HTML/CSS libre encadré par un vocabulaire de classes, convertir l'existant, et retirer le pipeline IA embarqué dans l'administration.

**Architecture:** Le contenu éditorial devient du HTML assaini stocké en base (`products.description`, `products.faq_html`, `banners.content_html`), l'image et le lien restant des champs structurés. Un vocabulaire de classes `nk-` bâti sur les tokens oklch existants donne à ce HTML une charte commune, et un contrôle sans pouvoir de blocage signale les écarts. Un script de conversion, intercalé entre deux déploiements pour rester compatible avec le canary, transforme l'existant en premier corpus conforme.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Drizzle ORM sur Cloudflare D1, Tailwind CSS 4 (tokens oklch), Vitest 4 (environnement `node`), Hugeicons, Wrangler.

**Spec:** `docs/superpowers/specs/2026-09-13-contenu-libre-retrait-ia-design.md`

## Global Constraints

- **Le hook de pre-commit bloque tout.** `tsc --noEmit`, `eslint`, `vitest run` et `scripts/check-migration-safety.mjs` tournent avant chaque commit. Un commit ne passe que si les quatre passent.
- **Commits conventionnels, scopes fermés.** `storefront | admin | whatsapp | auth | db | seo | claude | ci | deps | release`. Le hook `commit-msg` rejette tout autre scope.
- **Vitest tourne en environnement `node`**, `include: ["__tests__/**/*.test.ts"]`. Il n'y a ni jsdom ni `@testing-library` : **aucun composant React n'est rendu dans un test**. La logique de décision d'un composant doit être extraite en fonction pure exportée, et c'est cette fonction qui est testée. C'est la convention du dépôt (`__tests__/unit/components/product-wizard-initial-step.test.ts`).
- **Les chemins contenant des parenthèses doivent être quotés en bash** : `git add "app/(admin)/file.tsx"`.
- **N'utilise jamais `git add -A`.** La racine du dépôt contient de nombreux dossiers d'outils IA non suivis. Chaque commit liste ses fichiers explicitement.
- **Aucune suppression de colonne dans ce lot.** Phase *expand* uniquement : on ajoute des colonnes, on vide des données, on ne supprime jamais de colonne ni de table. `scripts/check-migration-safety.mjs` bloque `DROP COLUMN`, `DROP TABLE`, `RENAME COLUMN`.
- **Le scoping CSS est persisté à l'écriture, pas au rendu.** `sanitizeDescriptionHtml(html, scopeId)` inscrit `.desc-<scopeId>` devant chaque sélecteur des blocs `<style>` et c'est cette forme préfixée qui part en base. Tout code qui écrit du contenu libre doit appeler le sanitizer avec le bon `scopeId` : l'identifiant du produit pour une description ou une FAQ, `banner-<id>` pour une bannière.
- **Séquencement imposé par le canary.** Les tâches 1 à 9 forment le déploiement 1 et ne changent rien de visible. La conversion (étape R) tourne ensuite, contre la base distante, une fois ce déploiement promu à 100 %. Les tâches 10 à 15 forment le déploiement 2. **Ne fusionne jamais les deux phases dans une seule PR.**
- Toute la copie visible par l'utilisateur est en **français**.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
| --- | --- |
| `lib/content/check-design-conformance.ts` | Repère les écarts à la charte dans un document HTML. Ne bloque jamais. |
| `lib/content/icon-to-svg.ts` | Sérialise une icône Hugeicons (données `IconSvgElement`) en SVG inline. |
| `lib/content/story-to-html.ts` | Convertit une story structurée en document HTML `nk-`, et une FAQ JSON en accordéon. |
| `lib/content/banner-to-html.ts` | Convertit le gabarit de bannière en HTML `nk-`. |
| `lib/content/conversion-plan.ts` | Décide, pour une ligne donnée, ce que la conversion doit écrire. |
| `scripts/convert-content-to-html.ts` | CLI de conversion : lecture D1, appel des convertisseurs, écriture, rapport. |
| `components/admin/conformance-notices.tsx` | Affiche les écarts à la charte sous un éditeur HTML. |

**Modifiés :**

| Fichier | Nature du changement |
| --- | --- |
| `lib/db/schema.ts` | Deux colonnes : `banners.content_html`, `products.faq_html`. |
| `lib/db/types.ts` | `Banner.content_html`, `Product.faq_html`. |
| `lib/utils/sanitize-html.ts` | `details`/`summary`/`open` autorisés ; `productId` renommé `scopeId`. |
| `app/globals.css` | Nouveau `@layer` du vocabulaire `nk-`. |
| `components/storefront/hero-banner.tsx` | Rend `content_html` ; `buildSlides` exporté pour être testable. |
| `components/storefront/product-details.tsx` | Quatre onglets ; `reviews` reçu en `ReactNode`. |
| `components/storefront/product-story/index.tsx` | Réduit au seul contenu libre. |
| `components/storefront/product-story/story-free-content.tsx` | Pleine largeur en mode `html`. |
| `app/(storefront)/p/[slug]/page.tsx` | Passe `reviews` et `faqHtml` à `ProductDetails`. |
| `actions/admin/banners.ts` | `content_html` dans le schéma, l'insert et l'update. |
| `actions/admin/products.ts` | `faq_html` dans le schéma, l'insert et l'update ; champs story retirés. |
| `components/admin/banner-form.tsx` | Éditeur HTML pour `content_html`. |
| `components/admin/product-form-sections.tsx` | Éditeur HTML pour `faq_html` ; section story retirée. |
| `lib/validations/mcp-product.ts` | `story` retiré. |
| `lib/db/product-drafts.ts` | Colonnes story retirées de l'écriture et de la lecture. |
| `lib/mcp/tools/products.ts` | `DESCRIPTION_RULES` mis à jour. |

**Supprimés** (tâches 12, 15, 17) : `components/storefront/product-story/{story-tagline,story-highlights,story-feature-block,story-faq}.tsx`, `components/admin/{product-story-section,story-feature-block-editor,story-icon-picker}.tsx`, `app/(admin)/products/ai-new/`, `app/api/admin/products-ai/`, `actions/admin/products-ai.ts`, `app/(admin)/ai-settings/`, `components/admin/ai/`, `lib/ai/{client,config,product-research,image-vision-filter,submit-tool-schema,rate-limit}.ts`, `lib/validations/product-ai.ts`.

**Conservés jusqu'au *contract*, contre toute attente :** `components/storefront/product-story/icons.ts`, `lib/validations/product-story.ts` et `lib/utils/product-story.ts`. La machinerie de conversion en dépend — `icon-to-svg` lit la table d'icônes, `conversion-plan` appelle `parseHighlights` / `parseFeatureBlocks` / `parseFaq` — et la conversion doit rester rejouable tant que les colonnes story existent. Les supprimer dans ce lot rendrait injouable le jour où il faudrait la relancer.

**Déplacés** (tâche 15) : `lib/ai/image-fetch.ts` → `lib/storage/fetch-image.ts`, `lib/ai/image-search.ts` → `lib/media/image-search.ts`.

---

# Phase 1 — Déploiement 1

Rien de visible pour l'utilisateur. À la fin de cette phase, la base porte les deux nouvelles colonnes, le vocabulaire existe, le script de conversion est écrit et testé, et le hero sait rendre `content_html` sans le trouver.

## Task 1 : Colonnes `content_html` et `faq_html`

**Files:**
- Modify: `lib/db/schema.ts` (table `banners` ~ligne 427, table `products` ~ligne 204)
- Modify: `lib/db/types.ts` (interface `Banner` ~ligne 369, interface `Product` ~ligne 30)
- Create: `drizzle/<généré>.sql` + `drizzle/meta/` (produits par `npm run db:generate`)
- Test: `__tests__/unit/lib/db/content-columns.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `banners.content_html` et `products.faq_html` dans le schéma Drizzle ; `Banner.content_html: string | null` ; `Product.faq_html: string | null`.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/lib/db/content-columns.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { banners, products } from "@/lib/db/schema";

describe("colonnes de contenu libre", () => {
  it("banners expose content_html", () => {
    expect(banners.content_html).toBeDefined();
    expect(banners.content_html.name).toBe("content_html");
    expect(banners.content_html.notNull).toBe(false);
  });

  it("products expose faq_html", () => {
    expect(products.faq_html).toBeDefined();
    expect(products.faq_html.name).toBe("faq_html");
    expect(products.faq_html.notNull).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/lib/db/content-columns.test.ts`
Expected: FAIL — `banners.content_html` est `undefined`.

- [ ] **Step 3: Ajouter les colonnes au schéma**

Dans `lib/db/schema.ts`, table `banners`, après `bg_gradient_to` :

```ts
  content_html: text("content_html"),
```

Table `products`, après `faq` :

```ts
  faq_html: text("faq_html"),
```

- [ ] **Step 4: Ajouter les champs aux types**

Dans `lib/db/types.ts`, interface `Banner`, après `bg_gradient_to: string;` :

```ts
  content_html: string | null;
```

Interface `Product`, après `faq: ProductFaqItem[] | null;` :

```ts
  faq_html: string | null;
```

- [ ] **Step 5: Générer la migration**

Run: `npm run db:generate`
Relis le SQL produit dans `drizzle/` : il doit contenir exactement deux `ALTER TABLE ... ADD COLUMN` et rien d'autre. S'il contient un `DROP`, arrête-toi et signale — le schéma a dérivé de la base.

- [ ] **Step 6: Appliquer la migration en local**

Si la base D1 locale n'existe pas encore :
```bash
npx wrangler d1 execute netereka-db --local --command "SELECT 1"
```
Puis :
```bash
npm run db:migrate
```

- [ ] **Step 7: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/lib/db/content-columns.test.ts`
Expected: PASS

- [ ] **Step 8: Vérifier la sûreté de la migration**

Run: `npm run check:migrations`
Expected: aucun blocage — ce sont des `ADD COLUMN`.

- [ ] **Step 9: Commit**

```bash
git add lib/db/schema.ts lib/db/types.ts drizzle/ __tests__/unit/lib/db/content-columns.test.ts
git commit -m "feat(db): colonnes content_html et faq_html pour le contenu libre"
```

---

## Task 2 : Sanitizer — `<details>`, `<summary>` et paramètre `scopeId`

**Files:**
- Modify: `lib/utils/sanitize-html.ts` (`ALLOWED_TAGS` ligne 1-6, `ALLOWED_ATTRS` ligne 8-11, `sanitizeDescriptionHtml` ligne 769)
- Test: `__tests__/unit/sanitize-html.test.ts` (existant — on ajoute des cas)

**Interfaces:**
- Consumes: rien.
- Produces: `sanitizeDescriptionHtml(html: string, scopeId?: string): string` — signature inchangée en arité, seul le nom du paramètre change. `<details open>` et `<summary>` survivent à l'assainissement.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajoute à la fin de `__tests__/unit/sanitize-html.test.ts` :

```ts
describe("accordéon FAQ", () => {
  it("conserve details, summary et l'attribut open", () => {
    const out = sanitizeDescriptionHtml(
      "<details open><summary>Livraison ?</summary><p>48h à Abidjan.</p></details>",
    );
    expect(out).toContain("<details open>");
    expect(out).toContain("<summary>Livraison ?</summary>");
    expect(out).toContain("48h à Abidjan.");
  });

  it("assainit toujours ce qui est à l'intérieur d'un details", () => {
    const out = sanitizeDescriptionHtml(
      '<details><summary>X</summary><img src=x onerror="alert(1)"></details>',
    );
    expect(out).not.toContain("onerror");
  });
});

describe("portée CSS d'une bannière", () => {
  it("préfixe les sélecteurs avec l'identifiant de bannière", () => {
    const out = sanitizeDescriptionHtml(
      "<style>.title{color:red}</style><p class='title'>Hi</p>",
      "banner-12",
    );
    expect(out).toContain(".desc-banner-12 .title");
  });

  it("ne préfixe pas deux fois une règle déjà préfixée", () => {
    const once = sanitizeDescriptionHtml("<style>.t{color:red}</style>", "banner-12");
    const twice = sanitizeDescriptionHtml(once, "banner-12");
    expect(twice).toBe(once);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run __tests__/unit/sanitize-html.test.ts -t "accordéon FAQ"`
Expected: FAIL — `<details>` et `<summary>` sont retirés, la sortie ne les contient pas.

- [ ] **Step 3: Autoriser les balises et l'attribut**

Dans `lib/utils/sanitize-html.ts`, `ALLOWED_TAGS` — ajoute `"details", "summary"` à la dernière ligne du Set :

```ts
  "blockquote", "pre", "code", "style", "figure", "figcaption",
  "details", "summary",
```

`ALLOWED_ATTRS` — ajoute `"open"` :

```ts
  "class", "style", "href", "src", "alt", "width", "height",
  "colspan", "rowspan", "target", "rel", "open",
```

- [ ] **Step 4: Renommer le paramètre**

Dans la signature et le corps de `sanitizeDescriptionHtml`, remplace `productId` par `scopeId`. Il apparaît exactement cinq fois (lignes 769, 772, 855, 856, 979). Le préfixe émis reste `.desc-${scopeId}` — **ne change pas le format**, les données déjà en base le portent.

Mets à jour le commentaire de `scopeCssSelectors` (ligne ~613) : « so a product description's stylesheet » devient « so a free-content stylesheet ».

- [ ] **Step 5: Lancer la suite complète du sanitizer**

Run: `npx vitest run __tests__/unit/sanitize-html.test.ts`
Expected: PASS — les nouveaux cas comme les anciens. Le sanitizer est le module le plus sensible du dépôt : si un test existant casse, arrête-toi et comprends pourquoi avant de toucher quoi que ce soit.

- [ ] **Step 6: Commit**

```bash
git add lib/utils/sanitize-html.ts __tests__/unit/sanitize-html.test.ts
git commit -m "feat(storefront): autoriser details/summary et généraliser la portée CSS"
```

---

## Task 3 : Vocabulaire de classes `nk-`

**Files:**
- Modify: `app/globals.css` (après le `@layer base` des variables hero, ligne ~140, avant `@layer utilities`)
- Test: `__tests__/unit/content-vocabulary.test.ts`

**Interfaces:**
- Consumes: les tokens `--muted`, `--card`, `--border`, `--radius`, `--primary`, `--foreground`, `--muted-foreground` définis dans `:root`.
- Produces: les classes `nk-section`, `nk-section-alt`, `nk-container`, `nk-grid`, `nk-split`, `nk-lead`, `nk-card`, `nk-media`, `nk-specs`, `nk-quote`, `nk-cta`, `nk-faq`.

**Note post-exécution (revue finale).** Cette tâche a été exécutée avec un layer `@layer nk-content` dédié, tel que décrit plus bas. Une revue finale a trouvé que ce choix plaçait le vocabulaire APRÈS `utilities` dans la cascade réelle : `@import "tailwindcss"` déclare `@layer theme, base, components, utilities;` en toute première ligne de `app/globals.css`, ce qui fixe l'ordre de ces quatre noms avant que ce fichier ne déclare quoi que ce soit — un layer nommé mais absent de cette liste, comme `nk-content`, est ajouté ensuite, donc en dernier, et l'emporte sur `utilities` au lieu de s'effacer devant elle. Son ordre *textuel* dans le fichier (avant `@layer utilities`) ne disait rien de l'ordre réel de la cascade, qui se fixe par le nom, pas par la position. Le vocabulaire a donc été déplacé dans `@layer components` — un nom déjà dans la liste, positionné après `base` et avant `utilities` — et le test a été réécrit pour vérifier le nom du layer réellement utilisé plutôt qu'un décalage de caractères dans le fichier. Le code ci-dessous reflète l'état **avant** cette correction ; il documente comment la tâche a été exécutée, pas l'état actuel de `app/globals.css` ni de `__tests__/unit/content-vocabulary.test.ts` (voir ces fichiers pour le contenu réel).

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/content-vocabulary.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

const CLASSES = [
  "nk-section", "nk-section-alt", "nk-container",
  "nk-grid", "nk-split",
  "nk-lead", "nk-card", "nk-media", "nk-specs", "nk-quote", "nk-cta",
  "nk-faq",
];

describe("vocabulaire de contenu libre", () => {
  it("définit chaque classe du vocabulaire", () => {
    for (const c of CLASSES) {
      expect(css, `classe ${c} absente de globals.css`).toContain(`.${c}`);
    }
  });

  it("n'emploie aucune couleur littérale dans le bloc du vocabulaire", () => {
    const start = css.indexOf("@layer components {");
    const end = css.indexOf("@layer utilities");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // Borné au bloc lui-même : sans la borne haute, ce test inspecterait tout
    // ce qui suit dans le fichier et interdirait une couleur littérale là où
    // elle est légitime, tout en prétendant ne vérifier que le vocabulaire.
    const layer = css.slice(start, end);
    // Les couleurs doivent venir des tokens : var(--...), jamais d'un hex ou d'un rgb().
    expect(layer).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer).not.toMatch(/\brgba?\(/);
  });

  // PAS un test « le texte de @layer components apparaît avant le texte de
  // @layer utilities dans le fichier » : la cascade CSS ordonne les layers
  // NOMMÉS par leur PREMIÈRE apparition dans le document, jamais par leur
  // position textuelle plus bas dans le fichier. `@import "tailwindcss"`, en
  // tête de ce fichier, résout vers node_modules/tailwindcss/index.css, dont
  // la toute première ligne déclare `@layer theme, base, components, utilities;`
  // — cette instruction fixe l'ordre des quatre noms AVANT que ce fichier ne
  // déclare quoi que ce soit. Un layer qui n'y figure pas serait ajouté
  // ensuite, donc en DERNIER, et l'emporterait sur `utilities` : l'inverse de
  // ce que ce vocabulaire doit faire. D'où le choix de rejoindre `components`
  // — un nom déjà dans la liste — plutôt que d'ouvrir un layer à part.
  it("rejoint le layer components de Tailwind plutôt que d'ouvrir un layer à part", () => {
    const tailwindIndexPath = path.resolve(__dirname, "../../node_modules/tailwindcss/index.css");
    const tailwindIndex = readFileSync(tailwindIndexPath, "utf8");
    expect(tailwindIndex).toMatch(/^@layer\s+theme,\s*base,\s*components,\s*utilities;/);
    expect(css).toContain('@import "tailwindcss"');

    const vocabAnchor = css.indexOf(".nk-section {");
    expect(vocabAnchor).toBeGreaterThan(-1);
    const layerOpen = css.lastIndexOf("@layer components {", vocabAnchor);
    expect(layerOpen).toBeGreaterThan(-1);
    expect(layerOpen).toBeLessThan(vocabAnchor);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/content-vocabulary.test.ts`
Expected: FAIL — le bloc `@layer components` contenant `.nk-section` est introuvable.

- [ ] **Step 3: Écrire le bloc de vocabulaire**

Dans `app/globals.css`, **entre** le second `@layer base` (variables hero) et `@layer utilities`, insère :

```css
/* ---------------------------------------------------------------------------
 * Vocabulaire du contenu libre (`nk-`).
 *
 * Ces classes sont le seul point de contact entre le HTML rédigé à la main ou
 * par une IA et la charte du site. Elles sont bâties exclusivement sur les
 * tokens définis dans :root, donc justes en thème clair comme en thème sombre,
 * et responsives par construction.
 *
 * DANS `@layer components` — PAS un layer `nk-content` à part. `@import
 * "tailwindcss"`, tout en tête de ce fichier, déclare
 * `@layer theme, base, components, utilities;` en toute première ligne : cette
 * instruction fixe l'ordre de ces quatre noms dans la cascade avant que ce
 * fichier ne déclare quoi que ce soit. Un layer nommé mais absent de cette
 * liste serait ajouté ensuite, donc en DERNIER, et l'emporterait sur
 * `utilities` — l'inverse de l'effet recherché. Rejoindre `components` — un
 * nom déjà dans la liste — place ces règles au bon endroit : après `base`,
 * avant `utilities`, de sorte qu'une classe Tailwind écrite à côté d'une
 * classe `nk-` (par ex. `class="nk-card p-0"`) l'emporte bien comme attendu.
 *
 * Une règle écrite par l'auteur dans son propre bloc <style> reste, elle,
 * toujours prioritaire quel que soit le layer : le sanitizer la préfixe
 * `.desc-<scopeId>`, ce qui la rend plus spécifique que n'importe quelle
 * classe de ce fichier. Le vocabulaire propose, il n'impose pas.
 *
 * Toute couleur vient d'un token. Aucun hex, aucun rgb() ici — le test
 * __tests__/unit/content-vocabulary.test.ts le vérifie.
 * ------------------------------------------------------------------------- */
@layer components {
  /* Rythme vertical pleine largeur.
     <section class="nk-section"> … </section> */
  .nk-section {
    padding-block: 3rem;
  }
  @media (min-width: 640px) {
    .nk-section {
      padding-block: 5rem;
    }
  }

  /* Variante sur fond sourd, pour alterner le rythme.
     <section class="nk-section nk-section-alt"> … </section> */
  .nk-section-alt {
    background-color: var(--muted);
  }

  /* Largeur de lecture confortable. À poser SOUS une nk-section quand le
     contenu est du texte ; à omettre pour un bloc qui doit filer pleine largeur.
     <div class="nk-container"> … </div> */
  .nk-container {
    margin-inline: auto;
    max-width: 48rem;
    padding-inline: 1.5rem;
  }

  /* Grille à colonnes automatiques, une seule colonne sous 640px.
     <ul class="nk-grid"> <li class="nk-card"> … </li> </ul> */
  .nk-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: 1fr;
    margin-inline: auto;
    max-width: 72rem;
    padding-inline: 1.5rem;
    list-style: none;
  }
  @media (min-width: 640px) {
    .nk-grid {
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    }
  }

  /* Deux colonnes texte / media, empilées sous 768px.
     <div class="nk-split"> <div> … </div> <img class="nk-media" …> </div> */
  .nk-split {
    display: grid;
    gap: 2rem;
    grid-template-columns: 1fr;
    align-items: center;
    margin-inline: auto;
    max-width: 72rem;
    padding-inline: 1.5rem;
  }
  @media (min-width: 768px) {
    .nk-split {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* Chapô : la phrase d'accroche sous un titre de section.
     <p class="nk-lead">La batterie qui tient trois jours.</p> */
  .nk-lead {
    color: var(--muted-foreground);
    font-size: 1.125rem;
    line-height: 1.7;
  }

  /* Carte : un bloc de contenu détouré.
     <li class="nk-card"> <h3>…</h3> <p>…</p> </li> */
  .nk-card {
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--card-foreground);
    padding: 1.25rem;
  }

  /* Media : toute image du contenu libre.
     <img class="nk-media" src="…" alt="…"> */
  .nk-media {
    border-radius: var(--radius);
    display: block;
    height: auto;
    max-width: 100%;
  }

  /* Liste clé / valeur.
     <dl class="nk-specs"> <div><dt>Écran</dt><dd>6,7"</dd></div> </dl> */
  .nk-specs {
    display: grid;
    gap: 1px;
    background-color: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .nk-specs > div {
    background-color: var(--background);
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding: 0.75rem 1rem;
  }
  .nk-specs dt {
    color: var(--muted-foreground);
    flex-shrink: 0;
    font-size: 0.875rem;
  }
  .nk-specs dd {
    font-size: 0.875rem;
    font-weight: 500;
    margin-left: auto;
    text-align: right;
  }

  /* Citation mise en avant.
     <blockquote class="nk-quote">…</blockquote> */
  .nk-quote {
    border-left: 3px solid var(--primary);
    color: var(--foreground);
    font-size: 1.125rem;
    padding-left: 1.25rem;
  }

  /* Bouton d'appel à l'action.
     <a class="nk-cta" href="/c/telephones">Voir la gamme</a> */
  .nk-cta {
    background-color: var(--primary);
    border-radius: 9999px;
    color: var(--primary-foreground);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    /* 44px de hauteur minimale : cible tactile. */
    min-height: 2.75rem;
    padding: 0.625rem 1.5rem;
    text-decoration: none;
  }

  /* Accordéon FAQ, sans JavaScript.
     <div class="nk-faq">
       <details><summary>Question ?</summary><p>Réponse.</p></details>
     </div> */
  .nk-faq details {
    border-bottom: 1px solid var(--border);
  }
  .nk-faq summary {
    cursor: pointer;
    font-weight: 600;
    list-style: none;
    /* 44px de hauteur minimale : cible tactile. */
    min-height: 2.75rem;
    padding-block: 0.875rem;
  }
  .nk-faq summary::-webkit-details-marker {
    display: none;
  }
  .nk-faq summary::after {
    content: "+";
    color: var(--muted-foreground);
    float: right;
  }
  .nk-faq details[open] summary::after {
    content: "−";
  }
  .nk-faq details > *:not(summary) {
    color: var(--muted-foreground);
    padding-bottom: 1rem;
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/content-vocabulary.test.ts`
Expected: PASS

- [ ] **Step 5: Vérifier que le site compile toujours**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css __tests__/unit/content-vocabulary.test.ts
git commit -m "feat(storefront): vocabulaire de classes nk- pour le contenu libre"
```

---

## Task 4 : Contrôle de conformité à la charte

**Files:**
- Create: `lib/content/check-design-conformance.ts`
- Test: `__tests__/unit/lib/content/check-design-conformance.test.ts`

**Interfaces:**
- Consumes: rien — le module est pur, sans React ni DOM.
- Produces:
  ```ts
  export type ConformanceCode =
    | "literal-color" | "px-font-size" | "fixed-size"
    | "fixed-position" | "high-z-index" | "important" | "image-without-alt";
  export interface ConformanceIssue {
    code: ConformanceCode;
    line: number;      // 1-indexé
    excerpt: string;   // au plus 80 caractères
    suggestion: string;
  }
  export function checkDesignConformance(html: string): ConformanceIssue[];
  ```

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/lib/content/check-design-conformance.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

describe("checkDesignConformance", () => {
  it("ne remonte rien sur un document conforme", () => {
    const html = [
      '<section class="nk-section">',
      '  <div class="nk-container">',
      '    <p class="nk-lead">Trois jours d\'autonomie.</p>',
      '    <img class="nk-media" src="/images/x.jpg" alt="Vue de face">',
      "  </div>",
      "</section>",
    ].join("\n");
    expect(checkDesignConformance(html)).toEqual([]);
  });

  it("repère une couleur littérale et donne sa ligne", () => {
    const issues = checkDesignConformance('<p>ok</p>\n<p style="color:#ff0000">rouge</p>');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("literal-color");
    expect(issues[0].line).toBe(2);
    expect(issues[0].suggestion).toContain("var(--");
  });

  it("repère rgb() et hsl() comme couleurs littérales", () => {
    expect(checkDesignConformance('<p style="color:rgb(1,2,3)">x</p>')[0].code).toBe("literal-color");
    expect(checkDesignConformance("<style>.a{color:hsl(1,2%,3%)}</style>")[0].code).toBe("literal-color");
  });

  it("repère une taille de police en px", () => {
    const issues = checkDesignConformance('<p style="font-size:18px">x</p>');
    expect(issues[0].code).toBe("px-font-size");
    expect(issues[0].suggestion).toContain("rem");
  });

  it("repère une largeur fixe en px", () => {
    expect(checkDesignConformance("<style>.a{width:960px}</style>")[0].code).toBe("fixed-size");
  });

  it("repère position:fixed, un z-index élevé et !important", () => {
    expect(checkDesignConformance("<style>.a{position:fixed}</style>")[0].code).toBe("fixed-position");
    expect(checkDesignConformance("<style>.a{z-index:9999}</style>")[0].code).toBe("high-z-index");
    expect(checkDesignConformance("<style>.a{color:var(--primary)!important}</style>")[0].code).toBe("important");
  });

  it("ne remonte pas un z-index modeste", () => {
    expect(checkDesignConformance("<style>.a{z-index:2}</style>")).toEqual([]);
  });

  it("repère une image sans alt, y compris avec un alt vide", () => {
    expect(checkDesignConformance('<img src="/a.jpg">')[0].code).toBe("image-without-alt");
    expect(checkDesignConformance('<img src="/a.jpg" alt="">')[0].code).toBe("image-without-alt");
    expect(checkDesignConformance('<img src="/a.jpg" alt="Vue">')).toEqual([]);
  });

  it("tronque l'extrait à 80 caractères", () => {
    const long = `<p style="color:#fff">${"a".repeat(300)}</p>`;
    expect(checkDesignConformance(long)[0].excerpt.length).toBeLessThanOrEqual(80);
  });

  it("ne jette jamais et ne retourne jamais autre chose qu'un tableau", () => {
    expect(checkDesignConformance("")).toEqual([]);
    expect(checkDesignConformance("<<<>>> pas du HTML")).toBeInstanceOf(Array);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/lib/content/check-design-conformance.test.ts`
Expected: FAIL — le module n'existe pas.

- [ ] **Step 3: Écrire le module**

`lib/content/check-design-conformance.ts` :

```ts
/**
 * Repère les écarts d'un document de contenu libre à la charte du site.
 *
 * Ce module AVERTIT, il ne refuse jamais : il retourne une liste d'écarts et
 * n'a aucun pouvoir de blocage. Deux raisons, posées dans le spec (§ 2.2) :
 * le vocabulaire `nk-` ne peut pas anticiper tout cas légitime, et un blocage
 * à l'écriture recréerait la rigidité que ce lot supprime.
 *
 * Aucune dépendance à React ni au DOM : l'éditeur admin et les outils MCP du
 * lot B l'appellent tous les deux, côté serveur comme côté client.
 *
 * L'analyse est volontairement textuelle et ligne à ligne. Ce n'est pas un
 * parseur : un faux positif coûte un avertissement ignoré, pas un blocage.
 */

export type ConformanceCode =
  | "literal-color"
  | "px-font-size"
  | "fixed-size"
  | "fixed-position"
  | "high-z-index"
  | "important"
  | "image-without-alt";

export interface ConformanceIssue {
  code: ConformanceCode;
  /** 1-indexé, pour pointer la ligne dans l'éditeur. */
  line: number;
  excerpt: string;
  suggestion: string;
}

const EXCERPT_MAX = 80;

/** Au-delà, un z-index passe au-dessus de l'en-tête et des dialogues. */
const Z_INDEX_CEILING = 50;

interface Rule {
  code: ConformanceCode;
  re: RegExp;
  suggestion: string;
  /** Filtre optionnel sur la correspondance, pour les seuils. */
  accept?: (m: RegExpExecArray) => boolean;
}

const RULES: Rule[] = [
  {
    code: "literal-color",
    re: /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g,
    suggestion:
      "Emploie un token de la charte — var(--primary), var(--muted), var(--foreground) — plutôt qu'une couleur littérale : elle ne suit pas le thème sombre.",
  },
  {
    code: "px-font-size",
    re: /font-size\s*:\s*[\d.]+px/gi,
    suggestion: "Emploie rem ou em : une taille en px ignore le réglage de taille de police du visiteur.",
  },
  {
    code: "fixed-size",
    re: /(?:^|[;{"'\s])(?:width|height)\s*:\s*[\d.]+px/gi,
    suggestion:
      "Une dimension fixe déborde sur mobile. Emploie une largeur relative, max-width, ou une classe nk- (nk-container, nk-grid).",
  },
  {
    code: "fixed-position",
    re: /position\s*:\s*fixed/gi,
    suggestion: "position:fixed sort le bloc du flux et recouvre l'en-tête. Reste dans le flux de la page.",
  },
  {
    code: "high-z-index",
    re: /z-index\s*:\s*(\d+)/gi,
    suggestion: `Un z-index au-dessus de ${Z_INDEX_CEILING} passe devant l'en-tête et les dialogues du site.`,
    accept: (m) => Number(m[1]) > Z_INDEX_CEILING,
  },
  {
    code: "important",
    re: /!\s*important/gi,
    suggestion: "!important empêche toute correction ultérieure. Gagne en spécificité plutôt qu'en force.",
  },
];

const IMG_RE = /<img\b[^<>]*>/gi;

function excerptOf(line: string): string {
  const t = line.trim();
  return t.length <= EXCERPT_MAX ? t : `${t.slice(0, EXCERPT_MAX - 1)}…`;
}

export function checkDesignConformance(html: string): ConformanceIssue[] {
  if (!html) return [];
  const issues: ConformanceIssue[] = [];
  const lines = html.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const at = i + 1;

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let hit = false;
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.accept && !rule.accept(m)) continue;
        hit = true;
        break;
      }
      if (hit) {
        issues.push({ code: rule.code, line: at, excerpt: excerptOf(line), suggestion: rule.suggestion });
      }
    }

    IMG_RE.lastIndex = 0;
    let img: RegExpExecArray | null;
    while ((img = IMG_RE.exec(line)) !== null) {
      // alt="" compte comme absent : une image décorative n'a rien à faire
      // dans un contenu éditorial, et un alt vide est le plus souvent un oubli.
      if (!/\balt\s*=\s*("[^"]+"|'[^']+'|[^\s"'<>]+)/i.test(img[0])) {
        issues.push({
          code: "image-without-alt",
          line: at,
          excerpt: excerptOf(line),
          suggestion: "Décris l'image dans un attribut alt : sans lui, elle est invisible aux lecteurs d'écran et à Google.",
        });
        break;
      }
    }
  }

  return issues;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/lib/content/check-design-conformance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/content/check-design-conformance.ts __tests__/unit/lib/content/check-design-conformance.test.ts
git commit -m "feat(storefront): contrôle de conformité du contenu libre à la charte"
```

---

## Task 5 : Icônes Hugeicons en SVG inline

**Files:**
- Create: `lib/content/icon-to-svg.ts`
- Test: `__tests__/unit/lib/content/icon-to-svg.test.ts`

**Interfaces:**
- Consumes: `HIGHLIGHT_ICON_MAP` de `components/storefront/product-story/icons.ts`. **Ce fichier n'est pas supprimé par ce lot** : il devient la source d'icônes de la conversion et ne disparaîtra qu'au *contract*, avec les colonnes story. Ne le déplace pas non plus — `components/admin/story-icon-picker.tsx` l'importe encore jusqu'à la tâche 15, et `npx tsc --noEmit` casserait.
- Produces:
  ```ts
  export function iconToSvg(name: string, className?: string): string | null;
  ```
  Retourne le SVG inline, ou `null` si le nom est inconnu.

**Contexte pour l'implémenteur :** une icône Hugeicons n'est pas un composant mais une donnée — un tableau `[tag, attributs][]`. Les attributs sont en camelCase React (`strokeLinecap`, `strokeWidth`) et portent une clé `key` propre à React. Pour produire du SVG que le navigateur comprend, il faut passer en kebab-case et jeter `key`. Exemple réel de `BatteryFullIcon` :

```js
[["path", { d: "M2 12C2…", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "0" }], …]
```

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/lib/content/icon-to-svg.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { iconToSvg } from "@/lib/content/icon-to-svg";

describe("iconToSvg", () => {
  it("produit un SVG pour une icône connue", () => {
    const svg = iconToSvg("battery");
    expect(svg).not.toBeNull();
    expect(svg!.startsWith("<svg ")).toBe(true);
    expect(svg!.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain("<path ");
  });

  it("convertit les attributs camelCase de React en attributs SVG", () => {
    const svg = iconToSvg("battery")!;
    expect(svg).toContain("stroke-width=");
    expect(svg).toContain("stroke-linecap=");
    expect(svg).not.toContain("strokeWidth");
    expect(svg).not.toContain("strokeLinecap");
  });

  it("ne laisse jamais passer la clé React", () => {
    expect(iconToSvg("battery")!).not.toContain("key=");
  });

  it("applique la classe demandée", () => {
    expect(iconToSvg("camera", "nk-icon")!).toContain('class="nk-icon"');
  });

  it("retourne null sur un nom inconnu", () => {
    expect(iconToSvg("licorne")).toBeNull();
    expect(iconToSvg("")).toBeNull();
  });

  it("échappe les guillemets dans une valeur d'attribut", () => {
    // Aucune icône Hugeicons n'en contient, mais la sérialisation ne doit pas
    // pouvoir produire un attribut cassé si le paquet change.
    expect(iconToSvg("battery", 'a"b')!).toContain('class="a&quot;b"');
  });

  it("produit un SVG conforme à la charte", async () => {
    const { checkDesignConformance } = await import("@/lib/content/check-design-conformance");
    expect(checkDesignConformance(iconToSvg("battery")!)).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/lib/content/icon-to-svg.test.ts`
Expected: FAIL — le module n'existe pas.

- [ ] **Step 3: Écrire le module**

`lib/content/icon-to-svg.ts` :

```ts
import { HIGHLIGHT_ICON_MAP } from "@/components/storefront/product-story/icons";

/**
 * Sérialise une icône Hugeicons en SVG inline.
 *
 * Les icônes du paquet sont des données, pas des composants : un tableau de
 * paires [balise, attributs] où les attributs suivent la convention React
 * (camelCase, plus une clé `key`). Le navigateur, lui, attend du kebab-case et
 * ne connaît pas `key`.
 *
 * Ce module existe pour la conversion de l'existant (§ 3.1 du spec) : les
 * highlights d'une story portaient une icône rendue par React, et le contenu
 * libre qui les remplace ne peut porter que du SVG. Il est le dernier
 * consommateur de HIGHLIGHT_ICON_MAP, supprimé juste après.
 */

/** Le paquet dessine toutes ses icônes dans une grille 24×24. */
const VIEW_BOX = "0 0 24 24";

type IconNode = [string, Record<string, string | number>];

function toKebab(attr: string): string {
  return attr.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serializeNode([tag, attrs]: IconNode): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(attrs)) {
    // `key` est une instruction de réconciliation React, pas un attribut SVG.
    if (name === "key") continue;
    parts.push(`${toKebab(name)}="${escapeAttr(String(value))}"`);
  }
  return `<${tag}${parts.length ? ` ${parts.join(" ")}` : ""} />`;
}

export function iconToSvg(name: string, className?: string): string | null {
  if (!name || !Object.hasOwn(HIGHLIGHT_ICON_MAP, name)) return null;
  const nodes = HIGHLIGHT_ICON_MAP[name as keyof typeof HIGHLIGHT_ICON_MAP] as unknown as IconNode[];
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  const attrs = [
    `xmlns="http://www.w3.org/2000/svg"`,
    `viewBox="${VIEW_BOX}"`,
    `width="24"`,
    `height="24"`,
    `fill="none"`,
    // currentColor : l'icône prend la couleur du texte, donc celle du token
    // en vigueur, et suit le thème sombre sans règle supplémentaire.
    `stroke="currentColor"`,
    `aria-hidden="true"`,
  ];
  if (className) attrs.push(`class="${escapeAttr(className)}"`);

  return `<svg ${attrs.join(" ")}>${nodes.map(serializeNode).join("")}</svg>`;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/lib/content/icon-to-svg.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/content/icon-to-svg.ts __tests__/unit/lib/content/icon-to-svg.test.ts
git commit -m "feat(storefront): sérialisation des icônes Hugeicons en SVG inline"
```

---

## Task 6 : Conversion de la story produit en HTML

**Files:**
- Create: `lib/content/story-to-html.ts`
- Test: `__tests__/unit/lib/content/story-to-html.test.ts`

**Interfaces:**
- Consumes: `iconToSvg` (tâche 5), `checkDesignConformance` (tâche 4), `getImageUrl` de `@/lib/utils/images`, les types `ProductHighlight`, `ProductFeatureBlock`, `ProductFaqItem` de `@/lib/db/types`.
- Produces:
  ```ts
  export interface StoryInput {
    tagline: string | null;
    highlights: ProductHighlight[] | null;
    feature_blocks: ProductFeatureBlock[] | null;
    description_html: string | null;   // description existante, déjà en HTML
  }
  export interface StoryConversion {
    html: string;                 // "" si rien à convertir
    unresolvedIcons: string[];    // noms d'icônes non trouvées
  }
  export function storyToHtml(input: StoryInput): StoryConversion;
  export function faqToHtml(faq: ProductFaqItem[] | null): string;  // "" si vide
  ```

**Contexte pour l'implémenteur :** l'ordre d'agrégation reproduit l'ordre de rendu actuel de `components/storefront/product-story/index.tsx` — tagline, highlights, feature blocks, puis contenu libre existant. Les blocs à image alternent gauche/droite comme le fait `story-feature-block.tsx` aujourd'hui. La FAQ **ne rejoint pas** ce document : elle a son propre onglet et sa propre colonne.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/lib/content/story-to-html.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { storyToHtml, faqToHtml } from "@/lib/content/story-to-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

const EMPTY = { tagline: null, highlights: null, feature_blocks: null, description_html: null };

describe("storyToHtml", () => {
  it("retourne une chaîne vide quand il n'y a rien", () => {
    expect(storyToHtml(EMPTY)).toEqual({ html: "", unresolvedIcons: [] });
  });

  it("rend la tagline dans une section", () => {
    const { html } = storyToHtml({ ...EMPTY, tagline: "Trois jours d'autonomie." });
    expect(html).toContain('class="nk-section"');
    expect(html).toContain("Trois jours d'autonomie.");
  });

  it("échappe le HTML présent dans un champ texte", () => {
    const { html } = storyToHtml({ ...EMPTY, tagline: "5 < 10 & <script>x</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("rend les highlights en grille avec leur icône en SVG", () => {
    const { html, unresolvedIcons } = storyToHtml({
      ...EMPTY,
      highlights: [
        { icon: "battery", label: "7300 mAh" },
        { icon: "camera", label: "50 MP" },
      ],
    });
    expect(html).toContain('class="nk-grid"');
    expect(html).toContain("<svg ");
    expect(html).toContain("7300 mAh");
    expect(unresolvedIcons).toEqual([]);
  });

  it("omet une icône inconnue sans échouer et la signale", () => {
    const { html, unresolvedIcons } = storyToHtml({
      ...EMPTY,
      highlights: [{ icon: "licorne", label: "Magique" }],
    });
    expect(html).toContain("Magique");
    expect(html).not.toContain("<svg ");
    expect(unresolvedIcons).toEqual(["licorne"]);
  });

  it("rend un bloc sans image en pleine largeur lisible", () => {
    const { html } = storyToHtml({
      ...EMPTY,
      feature_blocks: [{ title: "Écran", body: "AMOLED 120 Hz" }],
    });
    expect(html).toContain('class="nk-container"');
    expect(html).toContain("<h3>Écran</h3>");
    expect(html).toContain("AMOLED 120 Hz");
  });

  it("rend un bloc avec image en deux colonnes", () => {
    const { html } = storyToHtml({
      ...EMPTY,
      feature_blocks: [
        { title: "Photo", body: "Capteur 1 pouce", image_url: "products/p1/a.jpg", image_alt: "Module photo" },
      ],
    });
    expect(html).toContain('class="nk-split"');
    expect(html).toContain('class="nk-media"');
    expect(html).toContain('alt="Module photo"');
  });

  it("retombe sur le titre quand image_alt manque", () => {
    const { html } = storyToHtml({
      ...EMPTY,
      feature_blocks: [{ title: "Photo", body: "x", image_url: "products/p1/a.jpg" }],
    });
    expect(html).toContain('alt="Photo"');
  });

  it("place la description existante en dernier, sans la modifier", () => {
    const existing = '<section class="nk-section"><p>Déjà écrit</p></section>';
    const { html } = storyToHtml({ ...EMPTY, tagline: "Accroche", description_html: existing });
    expect(html.indexOf("Accroche")).toBeLessThan(html.indexOf("Déjà écrit"));
    expect(html).toContain(existing);
  });

  it("produit un document conforme à la charte", () => {
    const { html } = storyToHtml({
      tagline: "Accroche",
      highlights: [{ icon: "battery", label: "7300 mAh" }],
      feature_blocks: [{ title: "Photo", body: "x", image_url: "products/p1/a.jpg", image_alt: "Module" }],
      description_html: null,
    });
    expect(checkDesignConformance(html)).toEqual([]);
  });
});

describe("faqToHtml", () => {
  it("retourne une chaîne vide pour null ou une liste vide", () => {
    expect(faqToHtml(null)).toBe("");
    expect(faqToHtml([])).toBe("");
  });

  it("produit un accordéon details/summary", () => {
    const html = faqToHtml([{ question: "Livraison ?", answer: "48h à Abidjan." }]);
    expect(html).toContain('class="nk-faq"');
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>Livraison ?</summary>");
    expect(html).toContain("48h à Abidjan.");
  });

  it("échappe le contenu des questions et des réponses", () => {
    const html = faqToHtml([{ question: "<b>Q</b>", answer: "<script>x</script>" }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Q&lt;/b&gt;");
  });

  it("produit un document conforme à la charte", () => {
    const html = faqToHtml([{ question: "Q", answer: "R" }]);
    expect(checkDesignConformance(html)).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/lib/content/story-to-html.test.ts`
Expected: FAIL — le module n'existe pas.

- [ ] **Step 3: Écrire le module**

`lib/content/story-to-html.ts` :

```ts
import type { ProductHighlight, ProductFeatureBlock, ProductFaqItem } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";
import { iconToSvg } from "@/lib/content/icon-to-svg";

/**
 * Convertit une story produit structurée en un document de contenu libre.
 *
 * L'ordre d'agrégation reproduit exactement l'ordre de rendu de
 * components/storefront/product-story/index.tsx avant sa réduction : tagline,
 * highlights, blocs, puis le contenu libre qui existait déjà. La FAQ n'est PAS
 * de la partie — elle a désormais son propre onglet et sa propre colonne, et
 * passe par faqToHtml.
 *
 * Le markup emploie le vocabulaire `nk-` (§ 2.1 du spec), pas un balisage ad
 * hoc : cette conversion est le premier corpus de contenu libre du site, et
 * c'est ce qui la rend conforme à la charte dès le premier jour. Le test
 * story-to-html.test.ts vérifie cette conformité en appelant
 * checkDesignConformance sur sa propre sortie.
 */

export interface StoryInput {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  feature_blocks: ProductFeatureBlock[] | null;
  /** Description déjà stockée, telle quelle. Placée en fin de document. */
  description_html: string | null;
}

export interface StoryConversion {
  html: string;
  unresolvedIcons: string[];
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Le corps d'un bloc et la réponse d'une FAQ acceptent des sauts de ligne —
 *  l'éditeur structuré les rendait via `whitespace-pre-line`. En HTML libre,
 *  chaque ligne devient son propre paragraphe. */
function paragraphs(text: string): string {
  return text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");
}

function taglineSection(tagline: string): string {
  return `<section class="nk-section"><div class="nk-container"><p class="nk-lead">${esc(tagline)}</p></div></section>`;
}

function highlightsSection(
  highlights: ProductHighlight[],
  unresolved: string[],
): string {
  const items = highlights
    .map((h) => {
      const svg = iconToSvg(h.icon, "nk-highlight-icon");
      if (!svg) unresolved.push(h.icon);
      return `<li class="nk-card">${svg ?? ""}<p>${esc(h.label)}</p></li>`;
    })
    .join("");
  return `<section class="nk-section nk-section-alt"><ul class="nk-grid">${items}</ul></section>`;
}

function featureBlockSection(block: ProductFeatureBlock, index: number): string {
  const heading = `<h3>${esc(block.title)}</h3>`;
  const body = paragraphs(block.body);

  if (!block.image_url) {
    return `<section class="nk-section"><div class="nk-container">${heading}${body}</div></section>`;
  }

  const img = `<img class="nk-media" src="${esc(getImageUrl(block.image_url))}" alt="${esc(block.image_alt || block.title)}" loading="lazy">`;
  const text = `<div>${heading}${body}</div>`;
  // Zig-zag : les blocs de rang impair inversent image et texte, comme le
  // faisait story-feature-block.tsx.
  const inner = index % 2 === 1 ? `${text}${img}` : `${img}${text}`;
  return `<section class="nk-section"><div class="nk-split">${inner}</div></section>`;
}

export function storyToHtml(input: StoryInput): StoryConversion {
  const unresolvedIcons: string[] = [];
  const parts: string[] = [];

  if (input.tagline && input.tagline.trim()) {
    parts.push(taglineSection(input.tagline.trim()));
  }
  if (input.highlights && input.highlights.length > 0) {
    parts.push(highlightsSection(input.highlights, unresolvedIcons));
  }
  if (input.feature_blocks && input.feature_blocks.length > 0) {
    input.feature_blocks.forEach((b, i) => parts.push(featureBlockSection(b, i)));
  }
  if (input.description_html && input.description_html.trim()) {
    parts.push(input.description_html.trim());
  }

  return { html: parts.join(""), unresolvedIcons };
}

export function faqToHtml(faq: ProductFaqItem[] | null): string {
  if (!faq || faq.length === 0) return "";
  const items = faq
    .map((item) => `<details><summary>${esc(item.question)}</summary>${paragraphs(item.answer)}</details>`)
    .join("");
  return `<section class="nk-section"><div class="nk-container"><div class="nk-faq">${items}</div></div></section>`;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/lib/content/story-to-html.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/content/story-to-html.ts __tests__/unit/lib/content/story-to-html.test.ts
git commit -m "feat(storefront): conversion de la story produit en contenu libre"
```

---

## Task 7 : Conversion du gabarit de bannière en HTML

**Files:**
- Create: `lib/content/banner-to-html.ts`
- Test: `__tests__/unit/lib/content/banner-to-html.test.ts`

**Interfaces:**
- Consumes: `formatPrice` de `@/lib/utils/format`, `checkDesignConformance` (tâche 4).
- Produces:
  ```ts
  export interface BannerTemplateInput {
    title: string;
    subtitle: string | null;
    badge_text: string | null;
    price: number | null;
    cta_text: string | null;
    link_url: string;
  }
  export function bannerTemplateToHtml(input: BannerTemplateInput): string;
  ```

**Contexte pour l'implémenteur :** la sortie doit reproduire l'aspect de la carte de verre rendue aujourd'hui par `components/storefront/hero-banner.tsx` (badge, titre, sous-titre, prix, bouton, le tout dans un panneau translucide). Le dégradé, l'image et la structure du carrousel restent en React et ne sont **pas** convertis. Le bouton reprend `nk-cta`.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/lib/content/banner-to-html.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { bannerTemplateToHtml } from "@/lib/content/banner-to-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

const BASE = {
  title: "OnePlus 15",
  subtitle: null,
  badge_text: null,
  price: null,
  cta_text: null,
  link_url: "/p/oneplus-15",
};

describe("bannerTemplateToHtml", () => {
  it("rend toujours le titre", () => {
    expect(bannerTemplateToHtml(BASE)).toContain("OnePlus 15");
  });

  it("omet les champs vides", () => {
    const html = bannerTemplateToHtml(BASE);
    expect(html).not.toContain("nk-badge");
    expect(html).not.toContain("XOF");
  });

  it("rend le badge, le sous-titre et le prix quand ils existent", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      badge_text: "Nouveauté",
      subtitle: "Snapdragon 8 Elite",
      price: 450000,
    });
    expect(html).toContain("Nouveauté");
    expect(html).toContain("Snapdragon 8 Elite");
    expect(html).toContain("450");
  });

  it("rend le bouton vers le lien, avec Découvrir par défaut", () => {
    const html = bannerTemplateToHtml(BASE);
    expect(html).toContain('href="/p/oneplus-15"');
    expect(html).toContain("Découvrir");
    expect(html).toContain("nk-cta");
  });

  it("respecte un libellé de bouton personnalisé", () => {
    expect(bannerTemplateToHtml({ ...BASE, cta_text: "Commander" })).toContain("Commander");
  });

  it("échappe le HTML des champs texte", () => {
    expect(bannerTemplateToHtml({ ...BASE, title: '<img src=x onerror="alert(1)">' }))
      .not.toContain("onerror");
  });

  it("produit un document conforme à la charte", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      badge_text: "Promo",
      subtitle: "Sous-titre",
      price: 199000,
      cta_text: "Voir",
    });
    expect(checkDesignConformance(html)).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/lib/content/banner-to-html.test.ts`
Expected: FAIL — le module n'existe pas.

- [ ] **Step 3: Écrire le module**

`lib/content/banner-to-html.ts` :

```ts
import { formatPrice } from "@/lib/utils/format";

/**
 * Convertit le gabarit de bannière en contenu libre.
 *
 * Ne convertit QUE le contenu textuel de la carte de verre : badge, titre,
 * sous-titre, prix, bouton. Le dégradé de fond, l'image et le carrousel restent
 * rendus par React (décision 1 du spec) — c'est ce qui préserve next/image et
 * le preload LCP.
 *
 * Le HTML produit est posé au-dessus d'un fond sombre par hero-banner.tsx :
 * les classes `nk-banner-*` définies dans globals.css lui donnent la carte
 * translucide qu'il avait, sans réintroduire de couleur littérale.
 */

export interface BannerTemplateInput {
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  price: number | null;
  cta_text: string | null;
  link_url: string;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bannerTemplateToHtml(input: BannerTemplateInput): string {
  const parts: string[] = [];

  if (input.badge_text?.trim()) {
    parts.push(`<p class="nk-banner-badge">${esc(input.badge_text.trim())}</p>`);
  }
  parts.push(`<h2 class="nk-banner-title">${esc(input.title)}</h2>`);
  if (input.subtitle?.trim()) {
    parts.push(`<p class="nk-banner-subtitle">${esc(input.subtitle.trim())}</p>`);
  }
  if (input.price != null) {
    parts.push(`<p class="nk-banner-price">${esc(formatPrice(input.price))}</p>`);
  }
  parts.push(
    `<a class="nk-cta" href="${esc(input.link_url)}">${esc(input.cta_text?.trim() || "Découvrir")}</a>`,
  );

  return `<div class="nk-banner">${parts.join("")}</div>`;
}
```

- [ ] **Step 4: Ajouter les classes de bannière au vocabulaire**

Dans `app/globals.css`, à la fin du bloc `@layer components` du vocabulaire ajouté en tâche 3 (voir la note post-exécution en tête de cette tâche : ce bloc a été renommé de `nk-content` vers `components` après une revue finale), avant l'accolade fermante :

```css
  /* Bannière hero : la carte translucide posée sur le dégradé rendu par React.
     Les couleurs sont fixes et non tokenisées ici — c'est volontaire : ce bloc
     vit TOUJOURS sur un fond sombre, jamais sur le fond de page, donc il ne
     suit pas le thème. Les valeurs sont exprimées en color-mix sur des
     couleurs nommées CSS pour éviter tout littéral hexadécimal.
     <div class="nk-banner"> … </div> */
  .nk-banner {
    backdrop-filter: blur(16px);
    background-color: color-mix(in oklch, white 10%, transparent);
    border: 1px solid color-mix(in oklch, white 20%, transparent);
    border-radius: var(--radius-xl);
    color: white;
    padding: 0.75rem;
  }
  @media (min-width: 640px) {
    .nk-banner {
      padding: 2rem;
    }
  }
  .nk-banner-badge {
    background-color: color-mix(in oklch, var(--hero-accent) 20%, transparent);
    border-radius: 9999px;
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    padding: 0.25rem 0.75rem;
    text-transform: uppercase;
  }
  .nk-banner-title {
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  @media (min-width: 640px) {
    .nk-banner-title {
      font-size: 1.875rem;
    }
  }
  .nk-banner-subtitle {
    color: color-mix(in oklch, white 70%, transparent);
    display: none;
    margin-top: 0.5rem;
  }
  @media (min-width: 640px) {
    .nk-banner-subtitle {
      display: block;
    }
  }
  .nk-banner-price {
    color: var(--hero-accent);
    font-weight: 600;
    margin-top: 0.5rem;
  }
  .nk-banner .nk-cta {
    background-color: white;
    color: var(--hero-bg);
    margin-top: 0.5rem;
  }
```

Ajoute `"nk-banner"` à la liste `CLASSES` de `__tests__/unit/content-vocabulary.test.ts`.

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run __tests__/unit/lib/content/banner-to-html.test.ts __tests__/unit/content-vocabulary.test.ts`
Expected: PASS pour les deux. Le test « aucune couleur littérale » passe parce que `white` est un mot-clé CSS, pas un hexadécimal ni un `rgb()`.

- [ ] **Step 6: Commit**

```bash
git add lib/content/banner-to-html.ts app/globals.css __tests__/unit/lib/content/banner-to-html.test.ts __tests__/unit/content-vocabulary.test.ts
git commit -m "feat(storefront): conversion du gabarit de bannière en contenu libre"
```

---

## Task 8 : Décision de conversion, ligne par ligne

**Files:**
- Create: `lib/content/conversion-plan.ts`
- Test: `__tests__/unit/lib/content/conversion-plan.test.ts`

**Interfaces:**
- Consumes: `storyToHtml`, `faqToHtml` (tâche 6), `bannerTemplateToHtml` (tâche 7), `sanitizeDescriptionHtml` (tâche 2), `parseHighlights`, `parseFeatureBlocks`, `parseFaq` de `@/lib/utils/product-story`.
- Produces:
  ```ts
  export interface ProductRow {
    id: string; description: string | null; description_type: string;
    tagline: string | null; highlights: string | null;
    feature_blocks: string | null; faq: string | null; faq_html: string | null;
  }
  export interface BannerRow {
    id: number; title: string; subtitle: string | null; badge_text: string | null;
    price: number | null; cta_text: string | null; link_url: string;
    content_html: string | null;
  }
  export type Plan<T> =
    | { action: "skip"; reason: string }
    | { action: "convert"; updates: T; unresolvedIcons: string[] };

  export function planProduct(row: ProductRow):
    Plan<{ description: string; description_type: "html"; faq_html: string | null }>;
  export function planBanner(row: BannerRow): Plan<{ content_html: string }>;
  ```

**Contexte pour l'implémenteur :** ce module porte toute la décision ; le script de la tâche 9 n'est qu'une coquille qui lit, appelle, écrit. C'est ce découpage qui rend la conversion testable — un CLI ne l'est pas dans ce dépôt.

Deux règles à ne pas perdre de vue :

1. **L'idempotence vient du vidage des colonnes.** Un produit déjà converti a ses quatre colonnes story à `NULL` et `description_type = 'html'` : il est ignoré. C'est le seul marqueur, il n'y en a pas d'autre.
2. **Le sanitizer est appelé avec le bon `scopeId`** — l'identifiant du produit pour une description ou une FAQ, `banner-<id>` pour une bannière. Le préfixe `.desc-<scopeId>` est inscrit dans le HTML stocké, pas appliqué au rendu. Passer un mauvais identifiant casse silencieusement le CSS de l'auteur.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/lib/content/conversion-plan.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { planProduct, planBanner } from "@/lib/content/conversion-plan";

function product(over: Partial<Parameters<typeof planProduct>[0]> = {}) {
  return {
    id: "p1",
    description: null,
    description_type: "richtext",
    tagline: null,
    highlights: null,
    feature_blocks: null,
    faq: null,
    faq_html: null,
    ...over,
  };
}

function banner(over: Partial<Parameters<typeof planBanner>[0]> = {}) {
  return {
    id: 7,
    title: "OnePlus 15",
    subtitle: null,
    badge_text: null,
    price: null,
    cta_text: null,
    link_url: "/p/oneplus-15",
    content_html: null,
    ...over,
  };
}

describe("planProduct", () => {
  it("ignore un produit déjà converti", () => {
    const plan = planProduct(product({ description: "<p>x</p>", description_type: "html" }));
    expect(plan.action).toBe("skip");
  });

  it("ignore un produit entièrement vide", () => {
    expect(planProduct(product()).action).toBe("skip");
  });

  it("convertit une story complète", () => {
    const plan = planProduct(product({
      tagline: "Accroche",
      highlights: JSON.stringify([
        { icon: "battery", label: "7300 mAh" },
        { icon: "camera", label: "50 MP" },
        { icon: "bolt", label: "100 W" },
      ]),
      feature_blocks: JSON.stringify([
        { title: "Écran", body: "AMOLED" },
        { title: "Photo", body: "1 pouce" },
      ]),
      faq: JSON.stringify([{ question: "Garantie ?", answer: "12 mois." }]),
    }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.description_type).toBe("html");
    expect(plan.updates.description).toContain("Accroche");
    expect(plan.updates.description).toContain("AMOLED");
    expect(plan.updates.faq_html).toContain("<summary>Garantie ?</summary>");
    // La FAQ ne doit PAS finir dans la description : elle a son propre onglet.
    expect(plan.updates.description).not.toContain("Garantie ?");
  });

  it("convertit une story partielle", () => {
    const plan = planProduct(product({ tagline: "Seule" }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.faq_html).toBeNull();
  });

  it("convertit un produit qui n'a qu'une description richtext", () => {
    const plan = planProduct(product({ description: '{"root":{}}', description_type: "richtext" }));
    expect(plan.action).toBe("convert");
  });

  it("remonte les icônes non résolues sans échouer", () => {
    const plan = planProduct(product({
      highlights: JSON.stringify([{ icon: "licorne", label: "Magique" }]),
    }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.unresolvedIcons).toEqual(["licorne"]);
  });

  it("préfixe le CSS de l'auteur avec l'identifiant du produit", () => {
    const plan = planProduct(product({
      description: "<style>.t{color:red}</style><p class='t'>x</p>",
      description_type: "html",
      tagline: "Accroche",
    }));
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.description).toContain(".desc-p1 .t");
  });

  it("est rejouable : convertir la sortie ne la change plus", () => {
    const first = planProduct(product({ tagline: "Accroche" }));
    if (first.action !== "convert") throw new Error("unreachable");
    const second = planProduct(product({
      description: first.updates.description,
      description_type: "html",
    }));
    expect(second.action).toBe("skip");
  });
});

describe("planBanner", () => {
  it("ignore une bannière déjà convertie", () => {
    expect(planBanner(banner({ content_html: "<div>x</div>" })).action).toBe("skip");
  });

  it("convertit le gabarit", () => {
    const plan = planBanner(banner({ badge_text: "Promo", price: 199000 }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.content_html).toContain("OnePlus 15");
    expect(plan.updates.content_html).toContain("Promo");
  });

  it("traite un content_html vide comme absent", () => {
    expect(planBanner(banner({ content_html: "   " })).action).toBe("convert");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/lib/content/conversion-plan.test.ts`
Expected: FAIL — le module n'existe pas.

- [ ] **Step 3: Écrire le module**

`lib/content/conversion-plan.ts` :

```ts
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { parseHighlights, parseFeatureBlocks, parseFaq } from "@/lib/utils/product-story";
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { storyToHtml, faqToHtml } from "@/lib/content/story-to-html";
import { bannerTemplateToHtml } from "@/lib/content/banner-to-html";

/**
 * Décide, pour une ligne donnée, ce que la conversion doit écrire.
 *
 * Tout le jugement est ici ; scripts/convert-content-to-html.ts n'est qu'une
 * coquille qui lit la base, appelle ces fonctions et écrit le résultat. Ce
 * découpage existe pour une raison simple : un CLI n'est pas testable dans ce
 * dépôt, une fonction pure l'est.
 */

export interface ProductRow {
  id: string;
  description: string | null;
  description_type: string;
  tagline: string | null;
  highlights: string | null;
  feature_blocks: string | null;
  faq: string | null;
  faq_html: string | null;
}

export interface BannerRow {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  price: number | null;
  cta_text: string | null;
  link_url: string;
  content_html: string | null;
}

export type Plan<T> =
  | { action: "skip"; reason: string }
  | { action: "convert"; updates: T; unresolvedIcons: string[] };

export interface ProductUpdates {
  description: string;
  description_type: "html";
  faq_html: string | null;
}

function blank(v: string | null): boolean {
  return v == null || v.trim() === "";
}

export function planProduct(row: ProductRow): Plan<ProductUpdates> {
  const hasStory =
    !blank(row.tagline) || !blank(row.highlights) || !blank(row.feature_blocks) || !blank(row.faq);

  // Idempotence : un produit déjà converti a ses colonnes story vides et une
  // description en HTML. C'est le seul marqueur — il n'y en a pas d'autre, et
  // c'est pour cela que la conversion VIDE les colonnes (§ 3.1 du spec).
  if (!hasStory && row.description_type === "html") {
    return { action: "skip", reason: "déjà converti" };
  }
  if (!hasStory && blank(row.description)) {
    return { action: "skip", reason: "aucun contenu" };
  }

  // Une description richtext est du JSON Lexical : elle doit passer par le
  // convertisseur avant de rejoindre un document HTML.
  const existingHtml = blank(row.description)
    ? null
    : descriptionToHtml(row.description, row.description_type);

  const { html, unresolvedIcons } = storyToHtml({
    tagline: row.tagline,
    highlights: parseHighlights(row.highlights),
    feature_blocks: parseFeatureBlocks(row.feature_blocks),
    description_html: existingHtml,
  });

  const faqHtml = faqToHtml(parseFaq(row.faq));

  return {
    action: "convert",
    unresolvedIcons,
    updates: {
      // Le scopeId est l'identifiant du produit : c'est celui qu'utilisait
      // l'écriture d'origine, donc les règles déjà préfixées le restent et
      // isAlreadyScoped() empêche un second préfixage.
      description: sanitizeDescriptionHtml(html, row.id),
      description_type: "html",
      faq_html: faqHtml ? sanitizeDescriptionHtml(faqHtml, row.id) : null,
    },
  };
}

export function planBanner(row: BannerRow): Plan<{ content_html: string }> {
  if (!blank(row.content_html)) {
    return { action: "skip", reason: "déjà converti" };
  }

  const html = bannerTemplateToHtml({
    title: row.title,
    subtitle: row.subtitle,
    badge_text: row.badge_text,
    price: row.price,
    cta_text: row.cta_text,
    link_url: row.link_url,
  });

  return {
    action: "convert",
    unresolvedIcons: [],
    updates: { content_html: sanitizeDescriptionHtml(html, `banner-${row.id}`) },
  };
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/lib/content/conversion-plan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/content/conversion-plan.ts __tests__/unit/lib/content/conversion-plan.test.ts
git commit -m "feat(storefront): décision de conversion du contenu existant"
```

---

## Task 9 : Script de conversion

**Files:**
- Create: `scripts/convert-content-to-html.ts`
- Modify: `package.json` (devDependency `tsx`, script `content:convert`)

**Interfaces:**
- Consumes: `planProduct`, `planBanner` (tâche 8).
- Produces: la commande `npm run content:convert -- --local|--remote [--dry-run]`.

**Contexte pour l'implémenteur :** aucun test unitaire sur ce fichier — toute sa logique vit dans `conversion-plan.ts`, déjà testé. Sa validation est le `--dry-run` du runbook (étape R).

Le script parle à D1 par le CLI Wrangler, comme `scripts/sync-local-db.sh` : lecture par `--json`, écriture par un fichier SQL. Deux pièges à ne pas rater :

- **Échappement SQL.** Le HTML contient des apostrophes. Un littéral SQLite s'échappe en doublant l'apostrophe, et rien d'autre.
- **`NEXT_PUBLIC_R2_URL` doit être défini.** `getImageUrl()` s'en sert pour construire le `src` des images de blocs, et ce `src` part en base. Sans la variable, le script écrirait des chemins `/images/...` cassés dans du contenu permanent. Le script refuse de démarrer sans elle.

- [ ] **Step 1: Ajouter tsx et le script npm**

```bash
npm install --save-dev tsx
```

Dans `package.json`, section `scripts`, après `"check:migrations"` :

```json
    "content:convert": "tsx scripts/convert-content-to-html.ts",
```

- [ ] **Step 2: Écrire le script**

`scripts/convert-content-to-html.ts` :

```ts
/**
 * Convertit le contenu structuré existant (story produit, gabarit de bannière)
 * en contenu libre HTML.
 *
 * Usage :
 *   npm run content:convert -- --local   --dry-run
 *   npm run content:convert -- --local
 *   npm run content:convert -- --remote  --dry-run
 *   npm run content:convert -- --remote
 *
 * Idempotent : une ligne déjà convertie est ignorée. Rejouable sans risque.
 *
 * IMPORTANT — ce script s'exécute ENTRE deux déploiements (§ 3.4 du spec), pas
 * pendant l'un d'eux. Le pipeline sert deux versions du code en canary : vider
 * les colonnes story est précisément ce qui garde l'ancienne version correcte,
 * puisqu'elle rend alors la description — qui contient désormais tout — et des
 * blocs story vides.
 *
 * La donnée d'origine n'est récupérable que par l'export D1 pris juste avant.
 * Cet export est une étape obligatoire du runbook.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { planProduct, planBanner, type ProductRow, type BannerRow } from "../lib/content/conversion-plan";

const DB_NAME = "netereka-db";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const local = args.includes("--local");
const dryRun = args.includes("--dry-run");

if (remote === local) {
  console.error("Choisis exactement une cible : --local ou --remote");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_R2_URL) {
  console.error(
    "NEXT_PUBLIC_R2_URL n'est pas défini. Les images des blocs seraient écrites avec un chemin cassé, " +
      "de façon permanente. Exporte la variable (voir .env.local) et relance.",
  );
  process.exit(1);
}

const target = remote ? "--remote" : "--local";

function d1Query<T>(sql: string): T[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, target, "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  const parsed = JSON.parse(out) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

function d1Exec(statements: string[]): void {
  if (statements.length === 0) return;
  const dir = mkdtempSync(path.join(tmpdir(), "netereka-convert-"));
  const file = path.join(dir, "convert.sql");
  writeFileSync(file, statements.join("\n"), "utf8");
  execFileSync("npx", ["wrangler", "d1", "execute", DB_NAME, target, "--file", file], {
    encoding: "utf8",
    stdio: "inherit",
    maxBuffer: 256 * 1024 * 1024,
  });
}

/** Littéral SQLite : on double l'apostrophe, et c'est tout. */
function lit(value: string | null): string {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

let converted = 0;
let skipped = 0;
let failed = 0;
const statements: string[] = [];

console.log(`\n=== Produits (${target}${dryRun ? ", simulation" : ""}) ===`);

const products = d1Query<ProductRow>(
  `SELECT id, description, description_type, tagline, highlights, feature_blocks, faq, faq_html
     FROM products`,
);

for (const row of products) {
  try {
    const plan = planProduct(row);
    if (plan.action === "skip") {
      skipped++;
      console.log(`  · ${row.id} — ignoré (${plan.reason})`);
      continue;
    }
    const icons = plan.unresolvedIcons.length
      ? ` — icônes non résolues : ${plan.unresolvedIcons.join(", ")}`
      : "";
    console.log(`  ✓ ${row.id} — converti${icons}`);
    converted++;
    statements.push(
      `UPDATE products SET description = ${lit(plan.updates.description)}, ` +
        `description_type = 'html', faq_html = ${lit(plan.updates.faq_html)}, ` +
        `tagline = NULL, highlights = NULL, feature_blocks = NULL, faq = NULL, ` +
        `updated_at = datetime('now') WHERE id = ${lit(row.id)};`,
    );
  } catch (err) {
    // Une ligne qui échoue est signalée et laissée intacte : le script
    // n'écrit rien pour elle (§ 3.3 du spec).
    failed++;
    console.error(`  ✗ ${row.id} — échec, laissé intact :`, err);
  }
}

console.log(`\n=== Bannières (${target}${dryRun ? ", simulation" : ""}) ===`);

const banners = d1Query<BannerRow>(
  `SELECT id, title, subtitle, badge_text, price, cta_text, link_url, content_html FROM banners`,
);

for (const row of banners) {
  try {
    const plan = planBanner(row);
    if (plan.action === "skip") {
      skipped++;
      console.log(`  · bannière ${row.id} — ignorée (${plan.reason})`);
      continue;
    }
    console.log(`  ✓ bannière ${row.id} — convertie`);
    converted++;
    statements.push(
      `UPDATE banners SET content_html = ${lit(plan.updates.content_html)}, ` +
        `updated_at = datetime('now') WHERE id = ${row.id};`,
    );
  } catch (err) {
    failed++;
    console.error(`  ✗ bannière ${row.id} — échec, laissée intacte :`, err);
  }
}

console.log(`\n=== Bilan ===`);
console.log(`  convertis : ${converted}`);
console.log(`  ignorés   : ${skipped}`);
console.log(`  échecs    : ${failed}`);

if (dryRun) {
  console.log(`\nSimulation : aucune écriture. ${statements.length} instruction(s) auraient été appliquées.`);
  process.exit(failed > 0 ? 1 : 0);
}

d1Exec(statements);
console.log(`\n${statements.length} instruction(s) appliquée(s).`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 3: Vérifier que le script démarre et refuse une cible ambiguë**

```bash
npm run content:convert
```
Expected: sortie `Choisis exactement une cible : --local ou --remote`, code de sortie 1.

- [ ] **Step 4: Vérifier le garde-fou sur la variable d'environnement**

```bash
env -u NEXT_PUBLIC_R2_URL npm run content:convert -- --local
```
Expected: le message sur `NEXT_PUBLIC_R2_URL`, code de sortie 1.

- [ ] **Step 5: Simulation contre la base locale**

Assure-toi d'abord d'avoir des données réalistes :
```bash
npm run db:sync
npm run content:convert -- --local --dry-run
```
Expected: une ligne par produit et par bannière, un bilan, et **aucune écriture**. Relis quelques lignes converties : c'est le seul moment où la fidélité de la conversion est vérifiable à l'œil.

- [ ] **Step 6: Vérifier les types et le lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add scripts/convert-content-to-html.ts package.json package-lock.json
git commit -m "feat(db): script de conversion du contenu structuré en HTML libre"
```

---

## Task 10 : Le hero lit `content_html` (avec repli de transition)

**Files:**
- Modify: `components/storefront/hero-banner.tsx`
- Test: `__tests__/unit/components/hero-banner-slides.test.ts`

**Interfaces:**
- Consumes: `Banner.content_html` (tâche 1).
- Produces: `export function buildSlides(banners: Banner[], fallbackProducts: ProductCardData[]): Slide[]`, `Slide` gagnant `content_html: string | null`.

**Contexte pour l'implémenteur :** `buildSlides` est aujourd'hui une fonction privée de ce fichier. On l'exporte pour la rendre testable — les tests de ce dépôt ne rendent aucun composant React.

Le repli sur le gabarit introduit ici est **une béquille de transition**, retirée en tâche 12. Elle existe pour que le déploiement 1 puisse partir avant que la conversion n'ait rempli `content_html` : sans elle, le hero serait vide entre le déploiement et la conversion.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/components/hero-banner-slides.test.ts` :

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("embla-carousel-react", () => ({ default: vi.fn() }));
vi.mock("embla-carousel-autoplay", () => ({ default: vi.fn() }));
vi.mock("next/image", () => ({ default: vi.fn() }));
vi.mock("next/link", () => ({ default: vi.fn() }));

import { buildSlides } from "@/components/storefront/hero-banner";
import type { Banner, ProductCardData } from "@/lib/db/types";

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 1, title: "OnePlus 15", subtitle: null, badge_text: null, badge_color: "mint",
    image_url: "banners/1-a.jpg", link_url: "/p/oneplus-15", cta_text: "Découvrir",
    price: null, bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    display_order: 0, is_active: 1, starts_at: null, ends_at: null,
    content_html: null, created_at: "", updated_at: "", ...over,
  };
}

const PRODUCT = {
  id: "p1", slug: "x", name: "Produit X", base_price: 1000, compare_price: null,
  brand: "Marque", is_featured: 1, image_url: "products/p1/a.jpg",
} as unknown as ProductCardData;

describe("buildSlides", () => {
  it("porte le content_html de la bannière", () => {
    const [slide] = buildSlides([banner({ content_html: "<div>Libre</div>" })], []);
    expect(slide.content_html).toBe("<div>Libre</div>");
  });

  it("laisse content_html à null quand la bannière n'en a pas", () => {
    expect(buildSlides([banner()], [])[0].content_html).toBeNull();
  });

  it("conserve l'image et le lien comme champs structurés", () => {
    const [slide] = buildSlides([banner({ content_html: "<div>Libre</div>" })], []);
    expect(slide.image_url).toBe("banners/1-a.jpg");
    expect(slide.link_url).toBe("/p/oneplus-15");
  });

  it("retombe sur les produits en vedette sans content_html", () => {
    const slides = buildSlides([], [PRODUCT]);
    expect(slides).toHaveLength(1);
    expect(slides[0].content_html).toBeNull();
    expect(slides[0].title).toBe("Produit X");
  });

  it("ne rend aucune slide sans bannière ni produit", () => {
    expect(buildSlides([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/components/hero-banner-slides.test.ts`
Expected: FAIL — `buildSlides` n'est pas exporté.

- [ ] **Step 3: Exporter `buildSlides` et lui ajouter `content_html`**

Dans `components/storefront/hero-banner.tsx`, interface `Slide`, après `bg_to: string;` :

```ts
  content_html: string | null;
```

Change `function buildSlides(` en `export function buildSlides(`. Dans la branche « bannières », ajoute au littéral :

```ts
      content_html: b.content_html,
```

Dans la branche « produits en vedette », ajoute :

```ts
    content_html: null,
```

- [ ] **Step 4: Rendre `content_html` dans la slide**

Dans le JSX, remplace tout le bloc de la carte de verre — de `<div className="rounded-xl border border-white/20 …">` jusqu'à son `</div>` fermant, celui qui suit le `<Link>` — par :

```tsx
                {slide.content_html ? (
                  /* Contenu libre. Le HTML a été assaini À L'ÉCRITURE
                     (actions/admin/banners.ts, ou le script de conversion),
                     jamais ici : faire tourner le sanitizer dans un composant
                     client l'embarquerait dans le bundle pour rien. */
                  <div dangerouslySetInnerHTML={{ __html: slide.content_html }} />
                ) : (
                  /* BÉQUILLE DE TRANSITION — supprimée au déploiement 2.
                     Elle couvre la fenêtre entre le déploiement 1 et la
                     conversion, pendant laquelle content_html est encore vide.
                     Elle sert aussi le repli sur les produits en vedette, qui
                     lui n'a pas de content_html par conception. */
                  <div className="rounded-xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:p-8">
                    {slide.badge_text && (
                      <span
                        className={cn(
                          "mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide sm:mb-3",
                          badgeColorMap[slide.badge_color]
                        )}
                      >
                        {slide.badge_text}
                      </span>
                    )}
                    <h2 className="text-lg font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {slide.title}
                    </h2>
                    {slide.subtitle && (
                      <p className="mt-2 hidden text-sm text-white/70 sm:block sm:text-base">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.price != null && (
                      <p className="mt-2 text-sm font-semibold text-emerald-300 sm:mt-3 sm:text-lg">
                        {formatPrice(slide.price)}
                      </p>
                    )}
                    <Link
                      href={slide.link_url}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 sm:mt-4 sm:px-6 sm:py-3 sm:text-sm"
                      style={{ color: slide.bg_from }}
                    >
                      {slide.cta_text}
                    </Link>
                  </div>
                )}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run __tests__/unit/components/hero-banner-slides.test.ts`
Expected: PASS

- [ ] **Step 6: Vérifier l'aspect réel**

```bash
npm run dev
```
Ouvre `http://localhost:3000`. Le hero doit être **strictement identique** à avant : aucune bannière ne porte encore de `content_html`, donc la béquille rend. C'est le résultat attendu du déploiement 1.

- [ ] **Step 7: Commit**

```bash
git add components/storefront/hero-banner.tsx __tests__/unit/components/hero-banner-slides.test.ts
git commit -m "feat(storefront): le hero rend content_html, gabarit en repli de transition"
```

---

## Étape R — Conversion (runbook, aucun code)

**À faire dans cet ordre, entre les deux déploiements. Ne saute aucune étape.**

**Opération irréversible.** Le seul filet est l'export de R6, et ce n'est pas un bouton « annuler » — voir R6 pour ce qu'il permet réellement de récupérer et ce qu'il ne permet pas.

- [ ] **R1. Pré-vol : mesurer l'invisibilité du déploiement de la phase 1.** `deja_balises_neuves` est la seule vérification empirique que ce déploiement est invisible. Le sanitizer élargi (balises `section`, `svg`, `details`…) s'applique **à la lecture**, sur des descriptions déjà en base aujourd'hui — un nombre non nul signifie qu'un contenu stocké va s'afficher différemment dès que la phase 1 sera fusionnée et promue, avant toute conversion. Rien dans cette mesure ne dépend du code déployé : elle lit la base de production telle qu'elle est déjà. La faire **avant** R2 (fusion) est donc possible, et c'est le seul moment où elle sert encore d'avertissement plutôt que de constat après coup.

  ```bash
  npx wrangler d1 execute netereka-db --remote --json --command \
    "SELECT sum(description_type='html' AND (description LIKE '%<section%' OR description LIKE '%<svg%' OR description LIKE '%<details%')) AS deja_balises_neuves FROM products"
  ```
  - Si **0** : rien de déjà stocké n'est concerné. Cocher cette case et consigner « 0 ligne concernée en production, mesuré le AAAA-MM-JJ » avant de poursuivre.
  - Si **≠ 0** : **s'arrêter** et inspecter ces lignes avant de fusionner. Une fois R2 fusionné et R3 promu à 100 %, ce contenu s'affiche déjà différemment pour tous les visiteurs — ce n'est plus une hypothèse à vérifier mais un fait en production.
- [ ] **R2.** Fusionner la PR de la phase 1 sur `main` et laisser le déploiement canary partir.
- [ ] **R3.** Promouvoir à 100 % via le workflow `promote.yml` (Actions → « Promote », jamais le tableau de bord Cloudflare ni `wrangler` en direct). Vérifier que l'issue « Pending promotion » se ferme.
- [ ] **R4.** Vérifier en production que le hero est inchangé et que `/p/<un-produit>` affiche toujours sa story.
- [ ] **R5. Pré-vol : mesurer le cas « richtext seul ».** `conversion-plan.ts` convertit aussi un produit qui n'a **aucune** colonne story mais dont la description richtext n'est pas vide : son JSON Lexical passe par `descriptionToHtml`, part en base comme HTML, et la source Lexical disparaît. Ce cas déborde du § 3.1 du spec (limité aux produits avec au moins un champ story renseigné) et collide avec deux décisions du lot : le spec § 5 garde l'éditeur richtext comme chemin court pour du texte simple, et la phase 2 rend `description_type === "html"` sans `prose` ni contrainte de largeur — une description écrite en richtext deviendrait du texte plein-large non typeset.

  Mesurer avant de décider quoi que ce soit, contre la base distante :
  ```bash
  npx wrangler d1 execute netereka-db --remote --json --command \
    "SELECT
       sum(trim(coalesce(tagline,''))='' AND trim(coalesce(highlights,''))='' AND trim(coalesce(feature_blocks,''))=''
           AND trim(coalesce(faq,''))='' AND description_type<>'html' AND trim(coalesce(description,''))<>'') AS richtext_seul
     FROM products"
  ```
  `richtext_seul` : nombre de produits sans **aucune** colonne story renseignée, avec une description non vide qui n'est pas déjà en HTML — exactement le cas hors-scope décrit ci-dessus (une simple description `description_type='html'` n'est pas comptée : elle est déjà dans le scope normal de la conversion, pas dans ce cas-là).
  - Si **0** : le cas est sans objet. Cocher cette case et consigner « 0 ligne concernée en production, mesuré le AAAA-MM-JJ » ici même avant de poursuivre — c'est la raison écrite qui dispense de trancher.
  - Si **≠ 0** : **s'arrêter** et décider explicitement avant R6 — soit exclure ces lignes de la conversion (ajouter leur id à une liste d'exclusion), soit accepter la conversion en sachant que leur source Lexical est perdue. Ne pas continuer sur un silence.
- [ ] **R6. Exporter la base distante.**
  ```bash
  npx wrangler d1 export netereka-db --remote --output=backup-avant-conversion-$(date +%Y%m%d-%H%M).sql
  ```
  Vérifier que le fichier n'est pas vide et le ranger hors du dépôt.

  **C'est le seul filet — et il ne fait PAS ce qu'on croit spontanément.** `wrangler d1 export` dump la base *entière*. Restaurer ce dump reviendrait à annuler toutes les commandes, tous les clients et tous les mouvements de stock enregistrés depuis, sur une boutique en paiement à la livraison où une commande, c'est un camion et un livreur déjà engagés. **Ne jamais restaurer ce dump tel quel.**

  La récupération réelle, si la conversion doit être défaite : extraire du dump les colonnes `id, description, description_type, tagline, highlights, feature_blocks, faq, faq_html` (table `products`) — ou `id, content_html` (table `banners`) — et ré-appliquer **ces colonnes-là, ligne par ligne**, sur la base courante, jamais la base entière. Les quatre colonnes story ne suffisent pas : `scripts/convert-content-to-html.ts` écrit aussi `description`, `description_type = 'html'` et `faq_html` en même temps qu'il vide les colonnes story — restaurer seulement `tagline, highlights, feature_blocks, faq` laisserait `description` porter la version convertie de la story et `description_type` à `'html'`, donc chaque produit « récupéré » afficherait sa story deux fois (en blocs, puis à nouveau dans la description).

  Mécanique concrète : charger le dump dans un SQLite local (`sqlite3 recovery.db < backup-avant-conversion-AAAAMMJJ-HHMM.sql`), puis y lire, pour chaque produit à restaurer, les huit colonnes ci-dessus afin de générer une instruction `UPDATE products SET description = …, description_type = …, tagline = …, highlights = …, feature_blocks = …, faq = …, faq_html = … WHERE id = …` par ligne, à exécuter ensuite contre la base de production — jamais un remplacement de table entière.
- [ ] **R7. Geler l'édition de contenu.** `actions/admin/products.ts` et `lib/db/product-drafts.ts` écrivent encore les quatre colonnes story ; tant que le déploiement 2 n'est pas en place, une sauvegarde admin ou un appel MCP de brouillon les re-remplit, et la fiche produit affiche alors à la fois la story ET la description qui la contient déjà. Prévenir l'équipe admin **avant** d'établir le gel — la prévenir après reviendrait à autoriser exactement la fenêtre d'édition que ce gel interdit. **Aucune édition de contenu produit ou bannière (admin comme MCP) entre R7 et le déploiement 2.**
- [ ] **R8.** Simulation distante, avec la variable d'environnement requise et **relire la sortie** :
  ```bash
  NEXT_PUBLIC_R2_URL=https://r2.netereka.ci npm run content:convert -- --remote --dry-run
  ```
  `NEXT_PUBLIC_R2_URL` compte : `getImageUrl()` la résout au moment de la conversion, donc la valeur utilisée ici est figée pour toujours dans le `src` de chaque image de bloc convertie et ne pourra plus être corrigée sans relancer une seconde conversion. La valeur ci-dessus est celle de `.env.local` ; ne pas la deviner ni la laisser vide (le script refuse de démarrer sans elle, mais un mauvais hôte ne serait pas détecté).

  **Condition d'arrêt.** Le résumé affiche `colonnes illisibles, contenu perdu : …` pour chaque produit dont une colonne story n'a pas validé le schéma — précisément pour qu'un humain puisse refuser de continuer. **Si le bilan rapporte au moins un produit concerné, s'arrêter** : réparer ou consigner ces lignes avant de lancer R9. Ne pas continuer sur un silence ici non plus.
- [ ] **R9. Conversion réelle**, avec la même variable, et la sortie conservée (le seul autre enregistrement de ce qui a été écrit est le scrollback du terminal) :
  ```bash
  NEXT_PUBLIC_R2_URL=https://r2.netereka.ci npm run content:convert -- --remote 2>&1 | tee conversion-$(date +%Y%m%d-%H%M).log
  ```
  Le script demande de taper `CONVERTIR` pour confirmer avant d'écrire — c'est attendu, pas un blocage à contourner.

  `wrangler d1 execute --file` envoie tout le fichier généré en une fois : si la commande échoue en cours de route, une partie des produits est convertie et l'autre non. Ne pas tenter de trier manuellement ce qui a été fait — R11 (rejouer le script) est le remède déjà prévu : la conversion est idempotente, une ligne déjà convertie ressort « ignorée », donc rejouer la commande de R9 telle quelle termine le travail sans risque de double conversion.
- [ ] **R10.** Vérifier en production. Le hero ne rend plus le même gabarit qu'avant — c'est le but du lot, pas une régression à corriger :
  - le badge s'affiche toujours dans `--hero-accent`, quelle que soit sa couleur d'origine (mint, orange, rouge, bleu) — `badge_color` n'existe pas dans `banner-to-html.ts` ;
  - la carte de verre n'a plus l'ombre portée `shadow-2xl` — `.nk-banner` ne définit aucun `box-shadow` ;
  - le titre perd son palier `lg:text-4xl` — `.nk-banner-title` n'a que deux tailles (mobile, ≥640px), pas de troisième au-delà ;
  - le texte du bouton grossit légèrement — `.nk-cta` ne fixe aucun `font-size`, il hérite du contexte au lieu du `text-xs`/`text-sm` d'avant ;
  - le prix change de teinte et, au-delà de 640px, de taille — `.nk-banner-price` passe à `var(--hero-accent)` en taille héritée, au lieu de `text-emerald-300 sm:text-lg` ;
  - le texte du bouton n'est plus teinté par diapositive — `.nk-banner .nk-cta` fixe `color: var(--hero-bg)` pour toutes les diapositives, au lieu de `style={{ color: slide.bg_from }}` (une couleur par diapositive) ;
  - le bouton devient un `<a>` ordinaire au lieu d'un `next/link` : cliquer dessus déclenche désormais un rechargement complet de la page plutôt qu'une navigation côté client. Conséquence connue de la décision de contenu libre, pas un défaut.

  Vérifier en parallèle qu'une fiche produit affiche sa description — l'ancienne version du code lit `description`, qui contient maintenant toute la story, et des colonnes story vides. Sur la fiche produit convertie, les highlights deviennent `<li class="nk-card">` et `.nk-card` ne fixe aucun `text-align`, alors que l'ancien rendu les centrait (`items-center text-center`) : les libellés de highlight passeront donc à gauche après conversion — attendu, pas une régression.
- [ ] **R11.** Rejouer le script pour confirmer l'idempotence : tout doit ressortir « ignoré », zéro conversion. Le gel de l'édition (R7) reste actif jusqu'à ce que le déploiement 2 (tâche 11 et suivantes) soit en production.

---

# Phase 2 — Déploiement 2

La conversion est faite : chaque produit porte sa description en HTML et sa FAQ dans `faq_html`, chaque bannière porte son `content_html`. On peut retirer l'ancien monde.

## Task 11 : Fiche produit en quatre onglets

**Files:**
- Modify: `components/storefront/product-details.tsx`
- Modify: `components/storefront/product-story/index.tsx`
- Modify: `app/(storefront)/p/[slug]/page.tsx` (~ligne 399-415)
- Test: `__tests__/unit/components/product-tabs.test.ts`

**Interfaces:**
- Consumes: `Product.faq_html` (tâche 1).
- Produces:
  ```ts
  export type ProductTabId = "description" | "details" | "reviews" | "faq";
  export function visibleProductTabs(input: {
    description: string | null;
    faqHtml: string | null;
    attributeCount: number;
  }): ProductTabId[];
  ```
  `ProductDetails` gagne les props `faqHtml: string | null` et `reviews: React.ReactNode`, et perd `tagline`, `highlights`, `featureBlocks`, `faq`.

**Contexte pour l'implémenteur :** l'onglet Avis est **toujours** présent, même sans aucun avis — c'est le seul moyen d'inviter au premier avis. Les trois autres n'apparaissent que si leur source est renseignée.

`ProductReviews` est un composant serveur asynchrone et `Tabs` est un composant client : on ne peut pas appeler l'un depuis l'autre. D'où le prop `reviews: React.ReactNode` — la page construit le `<Suspense>` et le passe en enfant. Le streaming des avis est préservé et `ProductReviews` n'est pas réécrit.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/components/product-tabs.test.ts` :

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/tabs", () => ({
  Tabs: vi.fn(), TabsContent: vi.fn(), TabsList: vi.fn(), TabsTrigger: vi.fn(),
}));
vi.mock("@/components/storefront/product-story", () => ({ ProductStory: vi.fn() }));

import { visibleProductTabs } from "@/components/storefront/product-details";

describe("visibleProductTabs", () => {
  it("affiche les quatre onglets quand tout est renseigné", () => {
    expect(visibleProductTabs({ description: "<p>x</p>", faqHtml: "<div>q</div>", attributeCount: 3 }))
      .toEqual(["description", "details", "reviews", "faq"]);
  });

  it("garde toujours l'onglet Avis, même sans contenu ailleurs", () => {
    expect(visibleProductTabs({ description: null, faqHtml: null, attributeCount: 0 }))
      .toEqual(["reviews"]);
  });

  it("masque Description quand la description est vide ou blanche", () => {
    expect(visibleProductTabs({ description: "   ", faqHtml: null, attributeCount: 0 }))
      .not.toContain("description");
  });

  it("masque Détails produit sans attribut", () => {
    expect(visibleProductTabs({ description: "<p>x</p>", faqHtml: null, attributeCount: 0 }))
      .toEqual(["description", "reviews"]);
  });

  it("masque FAQ sans faq_html", () => {
    expect(visibleProductTabs({ description: "<p>x</p>", faqHtml: "", attributeCount: 1 }))
      .toEqual(["description", "details", "reviews"]);
  });

  it("conserve toujours l'ordre Description, Détails, Avis, FAQ", () => {
    const tabs = visibleProductTabs({ description: "<p>x</p>", faqHtml: "<div>q</div>", attributeCount: 2 });
    expect(tabs.indexOf("description")).toBeLessThan(tabs.indexOf("details"));
    expect(tabs.indexOf("details")).toBeLessThan(tabs.indexOf("reviews"));
    expect(tabs.indexOf("reviews")).toBeLessThan(tabs.indexOf("faq"));
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/components/product-tabs.test.ts`
Expected: FAIL — `visibleProductTabs` n'est pas exporté.

- [ ] **Step 3: Réduire `ProductStory` dans la même tâche**

`product-details.tsx` et `product-story/index.tsx` se tiennent : tant que `ProductStory` réclame `tagline`, `highlights`, `featureBlocks` et `faq`, le nouveau `product-details.tsx` ne compile pas. Les deux changent donc ensemble — c'est ce qui fait de cette tâche une seule tâche. Remplace intégralement `components/storefront/product-story/index.tsx` par :

```tsx
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { StoryFreeContent } from "./story-free-content";

interface ProductStoryProps {
  description: string | null;
  descriptionType?: string;
  productId?: string;
}

/**
 * Contenu de l'onglet Description : un unique bloc de contenu libre.
 *
 * Les blocs structurés (tagline, highlights, feature blocks, FAQ) ont été
 * convertis en HTML et retirés — la FAQ ayant désormais son propre onglet.
 */
export function ProductStory({ description, descriptionType, productId }: ProductStoryProps) {
  if (!description || !descriptionToHtml(description, descriptionType)) return null;
  return (
    <section className="w-full">
      <StoryFreeContent
        description={description}
        descriptionType={descriptionType}
        productId={productId}
      />
    </section>
  );
}
```

Les quatre composants structurés qu'il n'importe plus deviennent orphelins. Ils sont supprimés en tâche 12, pas ici : un fichier orphelin ne casse ni la compilation ni le lint, et les supprimer maintenant gonflerait ce diff pour rien.

- [ ] **Step 4: Réécrire `product-details.tsx`**

Remplace intégralement le contenu de `components/storefront/product-details.tsx` par :

```tsx
import type { ReactNode } from "react";
import type { ProductAttribute } from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductStory } from "./product-story";

export type ProductTabId = "description" | "details" | "reviews" | "faq";

interface ProductDetailsProps {
  description: string | null;
  descriptionType?: string;
  faqHtml: string | null;
  productId: string;
  attributes: ProductAttribute[];
  /** Rendu par la page : <Suspense><ProductReviews …/></Suspense>. ProductReviews
   *  est un composant serveur asynchrone et Tabs est client — il ne peut pas être
   *  appelé d'ici, seulement reçu. */
  reviews: ReactNode;
}

const TAB_LABELS: Record<ProductTabId, string> = {
  description: "Description",
  details: "Détails produit",
  reviews: "Avis",
  faq: "FAQ",
};

function filled(value: string | null): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * Onglets à afficher, dans l'ordre.
 *
 * « Avis » est toujours là, même sans aucun avis : c'est ce qui permet
 * d'inviter au premier. Les trois autres disparaissent quand leur source est
 * vide — un onglet vide est pire que pas d'onglet.
 */
export function visibleProductTabs(input: {
  description: string | null;
  faqHtml: string | null;
  attributeCount: number;
}): ProductTabId[] {
  const tabs: ProductTabId[] = [];
  if (filled(input.description)) tabs.push("description");
  if (input.attributeCount > 0) tabs.push("details");
  tabs.push("reviews");
  if (filled(input.faqHtml)) tabs.push("faq");
  return tabs;
}

export function ProductDetails({
  description,
  descriptionType,
  faqHtml,
  productId,
  attributes,
  reviews,
}: ProductDetailsProps) {
  // La couleur est déjà exposée par le sélecteur de variante : la répéter dans
  // le tableau des caractéristiques est du bruit.
  const filteredAttributes = attributes.filter((a) => a.name !== "Couleur");
  const tabs = visibleProductTabs({
    description,
    faqHtml,
    attributeCount: filteredAttributes.length,
  });

  return (
    <section className="mt-10 border-t pt-8">
      <Tabs defaultValue={tabs[0]}>
        <TabsList variant="line" className="mb-6 min-h-11">
          {tabs.map((id) => (
            <TabsTrigger key={id} value={id} className="px-3 text-sm">
              {TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.includes("description") && (
          <TabsContent value="description">
            <ProductStory
              description={description}
              descriptionType={descriptionType}
              productId={productId}
            />
          </TabsContent>
        )}

        {tabs.includes("details") && (
          <TabsContent value="details">
            <AttributesTable attributes={filteredAttributes} />
          </TabsContent>
        )}

        <TabsContent value="reviews">{reviews}</TabsContent>

        {tabs.includes("faq") && (
          <TabsContent value="faq">
            {/* Assaini à l'écriture, comme toute la famille du contenu libre. */}
            <div
              className={`desc-${productId}`}
              dangerouslySetInnerHTML={{ __html: faqHtml! }}
            />
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}

function AttributesTable({ attributes }: { attributes: ProductAttribute[] }) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
      {attributes.map((attr) => (
        <div
          key={attr.id}
          className="flex items-baseline gap-4 bg-background px-4 py-3"
        >
          <dt className="shrink-0 text-sm text-muted-foreground">{attr.name}</dt>
          <dd className="ml-auto text-right text-sm font-medium">{attr.value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 5: Donner un état vide à `ProductReviews`**

Dans `app/(storefront)/p/[slug]/page.tsx`, fonction `ProductReviews` (~ligne 125), remplace la sortie anticipée :

```tsx
  if (ratingStats.count === 0) return null;
```

par :

```tsx
  if (ratingStats.count === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun avis pour le moment. Soyez le premier à donner le vôtre.
      </p>
    );
  }
```

Retire aussi le `className="mt-12 space-y-4"` du conteneur au profit de `className="space-y-4"` : la marge venait de sa position sous les onglets, il est maintenant dedans.

- [ ] **Step 6: Câbler la page**

Toujours dans `app/(storefront)/p/[slug]/page.tsx`, remplace le bloc `<ProductDetails … />` suivi du bloc `{/* Reviews */}` par :

```tsx
        <ProductDetails
          description={product.description}
          descriptionType={product.description_type}
          faqHtml={product.faq_html}
          productId={product.id}
          attributes={product.attributes}
          reviews={
            <Suspense fallback={null}>
              <ProductReviews productId={product.id} />
            </Suspense>
          }
        />
```

- [ ] **Step 7: Lancer le test et la compilation**

Run: `npx vitest run __tests__/unit/components/product-tabs.test.ts && npx tsc --noEmit`
Expected: PASS, et aucune erreur de type — `tsc` doit signaler tout appelant resté sur l'ancienne signature.

- [ ] **Step 8: Vérifier dans le navigateur**

```bash
npm run dev
```
Ouvre `/p/<un-produit-converti>` : quatre onglets, l'accordéon FAQ se déplie au clic sans JavaScript, les avis s'affichent dans leur onglet.

- [ ] **Step 9: Commit**

```bash
git add components/storefront/product-details.tsx components/storefront/product-story/index.tsx "app/(storefront)/p/[slug]/page.tsx" __tests__/unit/components/product-tabs.test.ts
git commit -m "feat(storefront): fiche produit en quatre onglets"
```

---

## Task 12 : Contenu libre pleine largeur, story structurée supprimée

**Files:**
- Modify: `components/storefront/product-story/story-free-content.tsx`
- Delete: `components/storefront/product-story/{story-tagline,story-highlights,story-feature-block,story-faq}.tsx`
- Delete: `__tests__/unit/product-story-icons.test.ts` si son sujet disparaît (voir étape 5)
- Test: `__tests__/unit/components/free-content-layout.test.ts`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces:
  ```ts
  export function freeContentLayout(descriptionType: string | undefined): {
    outerClass: string;
    innerClass: string;
  };
  ```
  `ProductStory` a déjà été réduit à `{ description, descriptionType?, productId? }` en tâche 11 ; cette tâche n'y retouche pas.

**Contexte pour l'implémenteur :** c'est ici que la contrainte de mise en page tombe. En mode `html`, plus de `max-w-3xl`, plus de `prose` : l'auteur décide, et `nk-container` lui rend une largeur de lecture quand il la veut. En mode `richtext` on garde `prose` — ce mode existe justement pour écrire sans se soucier de mise en forme.

- [ ] **Step 1: Écrire le test qui échoue**

`__tests__/unit/components/free-content-layout.test.ts` :

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/utils", () => ({ cn: (...a: unknown[]) => a.filter(Boolean).join(" ") }));

import { freeContentLayout } from "@/components/storefront/product-story/story-free-content";

describe("freeContentLayout", () => {
  it("ne contraint ni la largeur ni la typographie en mode html", () => {
    const { outerClass, innerClass } = freeContentLayout("html");
    expect(outerClass).not.toContain("max-w-3xl");
    expect(innerClass).not.toContain("prose");
  });

  it("conserve le conteneur de lecture en mode richtext", () => {
    const { outerClass, innerClass } = freeContentLayout("richtext");
    expect(outerClass).toContain("max-w-3xl");
    expect(innerClass).toContain("prose");
  });

  it("traite un type absent comme du richtext", () => {
    expect(freeContentLayout(undefined).innerClass).toContain("prose");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/components/free-content-layout.test.ts`
Expected: FAIL — `freeContentLayout` n'existe pas.

- [ ] **Step 3: Réécrire `story-free-content.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { descriptionToHtml } from "@/lib/utils/description-to-html";

interface StoryFreeContentProps {
  description: string;
  descriptionType?: string;
  productId?: string;
}

/**
 * Mise en page du contenu libre.
 *
 * En mode `html`, on ne contraint RIEN : ni largeur, ni typographie. C'est tout
 * l'objet de ce lot — l'auteur compose sa page, et `nk-container` lui rend une
 * largeur de lecture là où il la veut, au lieu de la lui imposer partout.
 *
 * En mode `richtext`, le conteneur `prose` reste : ce mode existe pour écrire
 * du texte sans penser à la mise en forme, et le priver de `prose` le rendrait
 * illisible.
 */
export function freeContentLayout(descriptionType: string | undefined): {
  outerClass: string;
  innerClass: string;
} {
  if (descriptionType === "html") {
    return { outerClass: "", innerClass: "" };
  }
  return {
    outerClass: "mx-auto max-w-3xl px-6",
    innerClass: "prose prose-lg max-w-none dark:prose-invert",
  };
}

export function StoryFreeContent({
  description,
  descriptionType,
  productId,
}: StoryFreeContentProps) {
  const html = descriptionToHtml(description, descriptionType);
  if (!html) return null;

  const { outerClass, innerClass } = freeContentLayout(descriptionType);
  // Le scoping CSS est inscrit dans le HTML stocké sous la forme
  // `.desc-<productId>` : sans cette classe sur un ancêtre, le <style> de
  // l'auteur ne s'applique à rien.
  const scopeClass =
    descriptionType === "html" && productId ? `desc-${productId}` : undefined;

  return (
    <div className={outerClass || undefined}>
      <div
        className={cn(innerClass, scopeClass) || undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Supprimer les composants structurés**

```bash
git rm components/storefront/product-story/story-tagline.tsx \
       components/storefront/product-story/story-highlights.tsx \
       components/storefront/product-story/story-feature-block.tsx \
       components/storefront/product-story/story-faq.tsx
```

**Ne supprime pas `components/storefront/product-story/icons.ts`** : `lib/content/icon-to-svg.ts` en dépend, et la conversion doit rester rejouable tant que les colonnes story existent. Il disparaîtra avec elles, au *contract*. `__tests__/unit/product-story-icons.test.ts` reste donc en place lui aussi.

- [ ] **Step 5: Vérifier qu'aucun import ne pend**

```bash
npx tsc --noEmit
grep -rn "story-tagline\|story-highlights\|story-feature-block\|story-faq" --include=*.ts --include=*.tsx app components lib
```
Expected: aucune erreur de type, aucune occurrence restante.

- [ ] **Step 6: Lancer toute la suite**

Run: `npm run test`
Expected: PASS. Les tests qui portaient sur le rendu structuré doivent avoir disparu avec leurs composants ; si l'un échoue encore, c'est qu'il testait autre chose — lis-le avant de le supprimer.

- [ ] **Step 7: Commit**

```bash
git add components/storefront/product-story/ __tests__/unit/components/free-content-layout.test.ts
git commit -m "feat(storefront): contenu libre pleine largeur, story structurée retirée"
```

---

## Task 13 : Retrait de la béquille du hero

**Files:**
- Modify: `components/storefront/hero-banner.tsx`
- Test: `__tests__/unit/components/hero-banner-slides.test.ts` (existant)

**Interfaces:**
- Consumes: `buildSlides` (tâche 10).
- Produces: rien de nouveau.

**Contexte pour l'implémenteur :** la béquille posée en tâche 10 a fait son office — la conversion (étape R) a rempli `content_html` pour toutes les bannières. Il reste un cas légitime sans `content_html` : le repli sur les produits en vedette, qui n'est pas du contenu éditorial (décision 1). Il garde donc son gabarit React.

Ne fais cette tâche **qu'après** avoir vérifié que l'étape R9 — la conversion réelle, pas l'export — est passée en production.

- [ ] **Step 1: Ajouter le test du repli**

Ajoute à `__tests__/unit/components/hero-banner-slides.test.ts` :

```ts
describe("après la conversion", () => {
  it("le repli produits en vedette garde ses champs de gabarit", () => {
    const [slide] = buildSlides([], [PRODUCT]);
    expect(slide.content_html).toBeNull();
    expect(slide.title).toBe("Produit X");
    expect(slide.cta_text).toBe("Découvrir");
  });

  it("une bannière convertie n'a plus besoin de ses champs de gabarit", () => {
    const [slide] = buildSlides(
      [banner({ content_html: "<div class='nk-banner'>Libre</div>", badge_text: null, subtitle: null })],
      [],
    );
    expect(slide.content_html).toContain("nk-banner");
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `npx vitest run __tests__/unit/components/hero-banner-slides.test.ts`
Expected: PASS — ces assertions tiennent déjà, elles verrouillent le comportement avant la simplification.

- [ ] **Step 3: Simplifier le rendu**

Dans `components/storefront/hero-banner.tsx`, la branche ternaire posée en tâche 10 devient :

```tsx
                {slide.content_html ? (
                  /* Contenu libre, assaini à l'écriture. */
                  <div dangerouslySetInnerHTML={{ __html: slide.content_html }} />
                ) : (
                  /* Repli sur les produits en vedette : ce n'est pas du contenu
                     éditorial mais notre propre gabarit, il reste en React. */
                  <div className="rounded-xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:p-8">
                    <h2 className="text-lg font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {slide.title}
                    </h2>
                    {slide.subtitle && (
                      <p className="mt-2 hidden text-sm text-white/70 sm:block sm:text-base">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.price != null && (
                      <p className="mt-2 text-sm font-semibold text-emerald-300 sm:mt-3 sm:text-lg">
                        {formatPrice(slide.price)}
                      </p>
                    )}
                    <Link
                      href={slide.link_url}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 sm:mt-4 sm:px-6 sm:py-3 sm:text-sm"
                      style={{ color: slide.bg_from }}
                    >
                      {slide.cta_text}
                    </Link>
                  </div>
                )}
```

Le badge disparaît de ce repli : les produits en vedette n'en portent pas de façon fiable, et `badgeColorMap` n'a plus d'autre usage. Supprime `badgeColorMap` et l'import de `BadgeColor` si plus rien ne les emploie — `npx tsc --noEmit` te le dira.

- [ ] **Step 4: Lancer les tests et la compilation**

Run: `npx vitest run __tests__/unit/components/hero-banner-slides.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS, aucune erreur, aucune variable inutilisée.

- [ ] **Step 5: Commit**

```bash
git add components/storefront/hero-banner.tsx __tests__/unit/components/hero-banner-slides.test.ts
git commit -m "refactor(storefront): retirer le gabarit de transition du hero"
```

---

## Task 14 : Administration des bannières en contenu libre

**Files:**
- Modify: `actions/admin/banners.ts` (`bannerSchema` ~ligne 62, `createBanner`, `updateBanner`)
- Modify: `components/admin/html-editor.tsx` (prop `onContentChange`)
- Create: `components/admin/conformance-notices.tsx`
- Modify: `components/admin/banner-form.tsx`
- Modify: `components/admin/banner-preview.tsx`
- Test: `__tests__/unit/actions/admin-banners.test.ts` (existant — on ajoute des cas)

**Interfaces:**
- Consumes: `checkDesignConformance` (tâche 4), `sanitizeDescriptionHtml` (tâche 2), `HtmlEditor` existant.
- Produces: `createBanner` et `updateBanner` acceptent et assainissent `content_html` ; `HtmlEditor` gagne `onContentChange?: (content: string) => void` ; `<ConformanceNotices html={…} />`.

**Contexte pour l'implémenteur :** le sanitizer doit être appelé **dans l'action serveur**, avec `banner-<id>`. Pour une création, l'identifiant n'existe pas avant l'INSERT — il faut donc insérer d'abord, puis mettre à jour `content_html` assaini avec l'identifiant obtenu. C'est une requête de plus, et c'est le prix du scoping persisté ; ne cherche pas à deviner l'identifiant.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `__tests__/unit/actions/admin-banners.test.ts`, `createBanner` est déjà outillé : `makeCreateBannerMock` rend un insert qui retourne `[{ id: 42 }]`, et `makeCreateBannerFormData` construit une FormData valide. Il manque une seule chose — `createBanner` va maintenant appeler `db.update()` pour écrire le `content_html` assaini, donc le faux `getDrizzle` doit l'exposer.

Étends `makeCreateBannerMock`, juste avant son `return` :

```ts
    // createBanner écrit content_html dans un second temps, quand l'id existe.
    const contentWhereMock = vi.fn().mockResolvedValue(undefined);
    const contentSetMock = vi.fn().mockReturnValue({ where: contentWhereMock });
    mocks.dbUpdate.mockReturnValue({ set: contentSetMock });

    mocks.getDrizzle.mockResolvedValue({
      select: selectMock,
      insert: mocks.dbInsert,
      update: mocks.dbUpdate,
    });

    return { selectMock, fromMock, valuesMock, returningMock, contentSetMock };
```

(remplace le `mocks.getDrizzle.mockResolvedValue({ select: selectMock, insert: mocks.dbInsert })` existant et son `return`).

Puis ajoute, dans le `describe("createBanner")` :

```ts
  // ── Contenu libre ────────────────────────────────────────────────────────

  it("assainit content_html avec la portée de la bannière", async () => {
    const { contentSetMock } = makeCreateBannerMock(3);
    const result = await createBanner(
      makeCreateBannerFormData({
        content_html: "<style>.t{color:var(--primary)}</style><p class=\"t\">Promo</p>",
      }),
    );
    expect(result.success).toBe(true);
    const written = contentSetMock.mock.calls[0][0] as { content_html: string };
    // Le scoping est inscrit dans le HTML stocké, avec l'id obtenu à l'INSERT.
    expect(written.content_html).toContain(".desc-banner-42 .t");
    expect(written.content_html).toContain("Promo");
  });

  it("retire le script d'un content_html hostile", async () => {
    const { contentSetMock } = makeCreateBannerMock(0);
    await createBanner(
      makeCreateBannerFormData({ content_html: "<p>ok</p><script>alert(1)</script>" }),
    );
    const written = contentSetMock.mock.calls[0][0] as { content_html: string };
    expect(written.content_html).not.toContain("alert(1)");
    expect(written.content_html).toContain("<p>ok</p>");
  });

  it("n'écrit rien de plus quand content_html est absent", async () => {
    const { contentSetMock } = makeCreateBannerMock(0);
    const result = await createBanner(makeCreateBannerFormData());
    expect(result.success).toBe(true);
    expect(contentSetMock).not.toHaveBeenCalled();
  });
```

Ajoute enfin un `describe("updateBanner")` — le fichier n'en a pas encore — en réutilisant le helper `makeDrizzleMock` déjà présent, qui rend `{ whereMock, setMock }` et stub `update().set().where()`. Pense à importer `updateBanner` en tête de fichier, à côté de `createBanner` :

```ts
describe("updateBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("assainit content_html avec la portée de la bannière", async () => {
    const { setMock } = makeDrizzleMock({ id: 7 });
    const fd = new FormData();
    fd.append("title", "Promo");
    fd.append("link_url", "/c/promos");
    fd.append("content_html", "<style>.t{color:var(--primary)}</style><p class=\"t\">Promo</p>");
    const result = await updateBanner(7, fd);
    expect(result.success).toBe(true);
    const written = setMock.mock.calls[0][0] as { content_html: string | null };
    expect(written.content_html).toContain(".desc-banner-7 .t");
  });

  it("efface content_html quand le champ est vidé", async () => {
    // null plutôt que "" : le hero teste la présence du contenu, et une chaîne
    // vide lui ferait afficher une carte vide au lieu de son repli.
    const { setMock } = makeDrizzleMock({ id: 7 });
    const fd = new FormData();
    fd.append("title", "Promo");
    fd.append("link_url", "/c/promos");
    fd.append("content_html", "");
    await updateBanner(7, fd);
    const written = setMock.mock.calls[0][0] as { content_html: string | null };
    expect(written.content_html).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run __tests__/unit/actions/admin-banners.test.ts -t "content_html"`
Expected: FAIL — `content_html` n'est ni validé ni écrit.

- [ ] **Step 3: Accepter `content_html` dans le schéma**

Dans `actions/admin/banners.ts`, `bannerSchema`, après `bg_gradient_to` :

```ts
  // Borne haute alignée sur MAX_INPUT_LENGTH de sanitizeDescriptionHtml.
  content_html: z.string().max(512_000).optional().default(""),
```

- [ ] **Step 4: Écrire `content_html` assaini**

Ajoute l'import en tête de fichier :

```ts
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
```

Dans `createBanner`, après avoir obtenu `inserted.id` et avant `revalidatePath` :

```ts
    // Le scoping CSS est inscrit dans le HTML stocké et dépend de l'identifiant,
    // qui n'existe qu'après l'INSERT. D'où ce second passage : il n'y a pas de
    // façon d'assainir correctement avant de connaître l'id.
    if (data.content_html) {
      await db
        .update(banners)
        .set({ content_html: sanitizeDescriptionHtml(data.content_html, `banner-${inserted.id}`) })
        .where(eq(banners.id, inserted.id));
    }
```

Dans `updateBanner`, ajoute au littéral passé à `.set({ … })` :

```ts
      content_html: data.content_html
        ? sanitizeDescriptionHtml(data.content_html, `banner-${id}`)
        : null,
```

- [ ] **Step 5: Ouvrir `HtmlEditor` sur le contenu courant**

Dans `components/admin/html-editor.tsx`, interface `HtmlEditorProps` :

```ts
interface HtmlEditorProps {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  /** Appelé à chaque frappe, pour les consommateurs qui affichent quelque chose
   *  à côté de l'éditeur (contrôle de conformité, compteur…). */
  onContentChange?: (content: string) => void;
}
```

Dans la signature, ajoute `onContentChange`. Dans `onUpdate`, après `if (hiddenRef.current) hiddenRef.current.value = content;` :

```ts
      onContentChange?.(content);
```

et ajoute `onContentChange` au tableau de dépendances du `useCallback`.

- [ ] **Step 6: Créer l'affichage des écarts**

`components/admin/conformance-notices.tsx` :

```tsx
"use client";

import { useMemo } from "react";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

/**
 * Affiche les écarts d'un document de contenu libre à la charte du site.
 *
 * Ce sont des AVERTISSEMENTS : rien n'est bloqué, l'enregistrement reste
 * possible avec des écarts (§ 2.2 du spec). Le rédacteur décide.
 */
export function ConformanceNotices({ html }: { html: string }) {
  const issues = useMemo(() => checkDesignConformance(html), [html]);
  if (issues.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-sm font-medium">
        {issues.length === 1
          ? "1 écart à la charte"
          : `${issues.length} écarts à la charte`}
        {" — l'enregistrement reste possible."}
      </p>
      <ul className="mt-2 space-y-1.5">
        {issues.map((issue, i) => (
          <li key={`${issue.code}-${issue.line}-${i}`} className="text-sm text-muted-foreground">
            <span className="font-mono text-xs">ligne {issue.line}</span> — {issue.suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Câbler l'éditeur dans le formulaire de bannière**

Dans `components/admin/banner-form.tsx` :

```tsx
import dynamic from "next/dynamic";
import { ConformanceNotices } from "./conformance-notices";

const HtmlEditor = dynamic(
  () => import("@/components/admin/html-editor").then((m) => m.HtmlEditor),
);
```

Ajoute l'état, à côté des autres :

```tsx
  const [contentHtml, setContentHtml] = useState(banner?.content_html ?? "");
```

Puis, dans une `Card` placée après celle du contenu textuel :

```tsx
        <Card>
          <CardHeader>
            <CardTitle>Contenu de la bannière</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              HTML libre, posé sur le dégradé. Emploie les classes de la charte —{" "}
              <code>nk-banner</code>, <code>nk-banner-title</code>, <code>nk-cta</code> — pour
              rester cohérent avec le reste du site.
            </p>
            <HtmlEditor
              name="content_html"
              defaultValue={banner?.content_html ?? ""}
              onContentChange={setContentHtml}
            />
            <ConformanceNotices html={contentHtml} />
          </CardContent>
        </Card>
```

- [ ] **Step 8: Adapter l'aperçu**

Dans `components/admin/banner-preview.tsx`, remplace le rendu du gabarit (badge, titre, sous-titre, prix, bouton) par, quand `contentHtml` est renseigné :

```tsx
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
```

et garde le gabarit existant en repli quand il est vide. Ajoute `contentHtml: string` aux props et passe-le depuis `banner-form.tsx`.

L'aperçu affiche du HTML **non encore assaini** — il n'a pas traversé le serveur. C'est acceptable : le rédacteur voit son propre texte, dans sa propre session d'administration, et l'assainissement a lieu à l'enregistrement. Ne reproduis pas ce raccourci côté boutique.

- [ ] **Step 9: Lancer les tests, les types et le lint**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: PASS partout.

- [ ] **Step 10: Vérifier dans le navigateur**

```bash
npm run dev
```
Sur `/banners/new` : l'éditeur apparaît, l'aperçu suit, et taper `<p style="color:#f00">x</p>` fait apparaître un avertissement sans empêcher l'enregistrement.

- [ ] **Step 11: Commit**

```bash
git add actions/admin/banners.ts components/admin/html-editor.tsx components/admin/conformance-notices.tsx components/admin/banner-form.tsx components/admin/banner-preview.tsx __tests__/unit/actions/admin-banners.test.ts
git commit -m "feat(admin): éditer les bannières en contenu libre avec contrôle de charte"
```

---

## Task 15 : Administration des produits — FAQ libre, éditeurs story retirés

**Files:**
- Modify: `actions/admin/products.ts` (schéma ~ligne 45 et ~562, écriture ~ligne 191 et ~645)
- Modify: `components/admin/product-form-sections.tsx`
- Modify: `components/admin/product-wizard/step-finalization.tsx`
- Delete: `components/admin/product-story-section.tsx`, `components/admin/story-feature-block-editor.tsx`, `components/admin/story-icon-picker.tsx`
- Test: `__tests__/unit/actions/admin-products-draft.test.ts` (existant)

**Interfaces:**
- Consumes: `HtmlEditor`, `ConformanceNotices` (tâche 14), `sanitizeDescriptionHtml`.
- Produces: `faq_html` accepté, assaini et écrit par les actions produit ; plus aucun champ story dans l'administration.

**Contexte pour l'implémenteur :** le spec (§ 5) demandait de retirer les éditeurs story et d'ajouter l'éditeur HTML aux bannières. Il ne disait pas explicitement que le produit avait besoin d'un éditeur de FAQ — sans lui, `faq_html` ne serait éditable que par le MCP du lot B, et l'administration perdrait une capacité qu'elle avait. Cette tâche comble ce manque.

- [ ] **Step 1: Écrire le test qui échoue**

Ajoute à `__tests__/unit/actions/admin-products-draft.test.ts`, à l'intérieur du `describe("saveDraftStep")` existant :

```ts
  // ── FAQ en contenu libre ──────────────────────────────────────────────────

  it("étape 5 : assainit faq_html avec la portée du produit", async () => {
    await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "5",
        faq_html:
          "<style>.q{color:var(--primary)}</style><details><summary>Q</summary><p>R</p></details>",
      }),
    );
    const [sql, params] = mocks.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("faq_html");
    const written = params.find(
      (v): v is string => typeof v === "string" && v.includes("<details>"),
    );
    expect(written).toBeDefined();
    // Le scoping est inscrit dans le HTML stocké, pas appliqué au rendu.
    expect(written).toContain(".desc-prod-1 .q");
    expect(written).toContain("<summary>Q</summary>");
  });

  it("étape 5 : retire le script d'une FAQ hostile", async () => {
    await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "5", faq_html: "<p>ok</p><script>alert(1)</script>" }),
    );
    const [, params] = mocks.execute.mock.calls[0] as [string, unknown[]];
    expect(JSON.stringify(params)).not.toContain("alert(1)");
  });

  it("étape 5 : écrit null pour une FAQ vide", async () => {
    await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "5", faq_html: "", meta_title: "Titre" }),
    );
    const [sql, params] = mocks.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("faq_html");
    expect(params).toContain(null);
  });

  it("étape 5 : n'écrit plus aucune colonne story", async () => {
    await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "5", meta_title: "Titre", tagline: "Ancienne accroche" }),
    );
    const sql: string = mocks.execute.mock.calls[0][0];
    for (const col of ["tagline", "highlights", "feature_blocks", "faq ="]) {
      expect(sql).not.toContain(col);
    }
  });
```

**Note pour la revue :** `actions/admin/products.ts` est en SQL brut, et le CLAUDE.md interdit d'écrire du nouveau SQL brut. Ce n'en est pas : on ajoute une colonne à des requêtes qui existent déjà, dans un fichier qui reste intégralement en SQL brut. Le migrer vers Drizzle est un chantier à part entière, hors périmètre de ce lot — si CodeRabbit le signale, c'est la réponse à lui faire.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run __tests__/unit/actions/admin-products-draft.test.ts -t "faq_html"`
Expected: FAIL — le champ n'est pas reconnu.

- [ ] **Step 3: Accepter et écrire `faq_html`**

Dans `actions/admin/products.ts`, ajoute au schéma principal (~ligne 45) et au schéma de sauvegarde par étape (~ligne 562) :

```ts
  faq_html: z.string().max(512_000).optional().default(""),
```

À l'écriture (~ligne 191 et ~584), à côté du traitement de `description` :

```ts
  const finalFaqHtml = data.faq_html ? sanitizeDescriptionHtml(data.faq_html, id) : null;
```

et ajoute `faq_html: finalFaqHtml` aux colonnes écrites. Ajoute `"faq_html"` à la liste de colonnes de la ligne ~645.

- [ ] **Step 4: Retirer les champs story du schéma et de l'écriture**

Toujours dans `actions/admin/products.ts` : retire `tagline`, `highlights`, `feature_blocks`, `faq` des schémas, des colonnes écrites et de la liste ~645, ainsi que l'import depuis `@/lib/validations/product-story`.

**Ne supprime pas les colonnes en base** : elles restent jusqu'au *contract*. On cesse seulement de les écrire.

- [ ] **Step 5: Remplacer la section story par un éditeur de FAQ**

Dans `components/admin/product-form-sections.tsx` et `components/admin/product-wizard/step-finalization.tsx`, retire l'import et l'usage de `ProductStorySection`, et mets à la place :

```tsx
        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Affichée dans son propre onglet sur la fiche. Emploie{" "}
              <code>&lt;details&gt;</code> et <code>&lt;summary&gt;</code> dans un{" "}
              <code>&lt;div class=&quot;nk-faq&quot;&gt;</code> pour l&apos;accordéon.
            </p>
            <HtmlEditor
              name="faq_html"
              defaultValue={product?.faq_html ?? ""}
              onContentChange={setFaqHtml}
            />
            <ConformanceNotices html={faqHtml} />
          </CardContent>
        </Card>
```

avec, dans le composant : `const [faqHtml, setFaqHtml] = useState(<source>?.faq_html ?? "");` — remplace `<source>` par le nom réel du prop dans ce fichier, que tu **liras** au lieu de le deviner ; `ProductStorySection` recevait déjà les champs story depuis cette même source. Ajoute les imports de `HtmlEditor` (en `dynamic`, comme dans `banner-form.tsx`) et de `ConformanceNotices`.

- [ ] **Step 6: Supprimer les éditeurs structurés**

```bash
git rm components/admin/product-story-section.tsx \
       components/admin/story-feature-block-editor.tsx \
       components/admin/story-icon-picker.tsx
```

- [ ] **Step 7: Vérifier qu'il ne reste aucun fil qui pend**

```bash
npx tsc --noEmit
grep -rn "ProductStorySection\|StoryIconPicker\|StoryFeatureBlockEditor" --include=*.ts --include=*.tsx app components lib actions
```
Expected: aucune erreur, aucune occurrence.

- [ ] **Step 8: Lancer toute la suite**

Run: `npm run test && npm run lint`
Expected: PASS. Les tests du wizard (`product-wizard-initial-step`, `product-wizard-touch-targets`) doivent passer après l'élagage ; s'ils échouent sur une étape story disparue, adapte-les.

- [ ] **Step 9: Commit**

```bash
git add actions/admin/products.ts components/admin/ __tests__/unit/actions/admin-products-draft.test.ts
git commit -m "feat(admin): FAQ produit en contenu libre, éditeurs story retirés"
```

---

## Task 16 : Élagage du contrat MCP

**Files:**
- Modify: `lib/validations/mcp-product.ts`
- Modify: `lib/db/product-drafts.ts` (`buildProductColumns` ~ligne 77, `getDraft` ~ligne 278)
- Modify: `lib/mcp/tools/products.ts` (`DESCRIPTION_RULES` ~ligne 40)
- Test: `__tests__/unit/lib/validations/mcp-product.test.ts`, `__tests__/unit/lib/db/product-drafts.test.ts` (existants)

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `createDraftSchema` et `updateDraftSchema` sans `story`, avec `faq_html` ; `DraftDetail` sans `story`, avec `faq_html`.

**Contexte pour l'implémenteur :** les outils MCP sont **en production**. Tant qu'ils acceptent `story`, un client IA croit écrire une story et cette écriture part dans des colonnes que plus rien ne lit — une perte silencieuse, le pire des comportements. On remplace `story` par `faq_html`, qui est le seul champ de contenu que le MCP ne pouvait pas encore écrire.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `__tests__/unit/lib/validations/mcp-product.test.ts`, remplace les cas portant sur `story` par :

```ts
describe("contrat de contenu", () => {
  it("rejette un champ story, qui n'existe plus", () => {
    const parsed = createDraftSchema.safeParse({
      name: "X", category_id: "c1",
      story: { tagline: "Accroche" },
    });
    // Le schéma est strict sur ce qu'il connaît : story n'est simplement plus lu.
    if (parsed.success) expect("story" in parsed.data).toBe(false);
  });

  it("accepte faq_html", () => {
    const parsed = createDraftSchema.safeParse({
      name: "X", category_id: "c1",
      faq_html: "<div class='nk-faq'><details><summary>Q</summary><p>R</p></details></div>",
    });
    expect(parsed.success).toBe(true);
  });

  it("borne faq_html à la taille d'entrée du sanitizer", () => {
    const parsed = createDraftSchema.safeParse({
      name: "X", category_id: "c1", faq_html: "a".repeat(512_001),
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run __tests__/unit/lib/validations/mcp-product.test.ts`
Expected: FAIL — `faq_html` est inconnu du schéma.

- [ ] **Step 3: Élaguer les validations**

Dans `lib/validations/mcp-product.ts` : supprime `storyInputSchema` et l'import depuis `@/lib/validations/product-story`. Retire le champ `story` de `createDraftSchema` et `updateDraftSchema`, et ajoute à chacun :

```ts
  faq_html: z.string().max(DESCRIPTION_MAX_BYTES).nullable().optional(),
```

- [ ] **Step 4: Élaguer l'écriture et la lecture**

Dans `lib/db/product-drafts.ts`, `buildProductColumns` : retire les quatre affectations des colonnes story et ajoute, à côté de celle de `description` :

```ts
  if (input.faq_html !== undefined) {
    cols.faq_html = input.faq_html ? sanitizeDescriptionHtml(input.faq_html, productId) : null;
  }
```

Dans `getDraft` : retire `story` de l'objet retourné et de l'interface `DraftDetail`, ajoute `faq_html: row.faq_html`. Retire les appels de parsing story devenus inutiles.

- [ ] **Step 5: Mettre à jour la documentation des outils**

Dans `lib/mcp/tools/products.ts`, `DESCRIPTION_RULES` : remplace la partie `story {…}` par une description de `faq_html`, et mentionne le vocabulaire :

```ts
const DESCRIPTION_RULES =
  "Champs : name (requis), category_id (requis, voir list_categories), brand, short_description (≤120), " +
  "description_html (HTML libre, assaini côté serveur — c'est le contenu de l'onglet Description de la fiche), " +
  "faq_html (HTML libre de l'onglet FAQ : une suite de <details><summary>Question</summary><p>Réponse</p></details> " +
  "dans un <div class=\"nk-faq\">), " +
  "seo {meta_title ≤60, meta_description ≤160}, " +
  "attributes {colors[{name,hex}], dimensions {length_mm,height_mm,width_mm,weight_g}, specs[{name,value}]}, " +
  "pricing {base_price, compare_price, sku, stock_quantity, low_stock_threshold, weight_grams} (prix en XOF entiers). " +
  "Mise en page : emploie les classes de la charte — nk-section, nk-container, nk-grid, nk-card, nk-media, nk-specs, " +
  "nk-lead, nk-quote, nk-cta, nk-faq — plutôt que des styles en dur ; elles suivent le thème clair et sombre.";
```

- [ ] **Step 6: Lancer les tests concernés**

Run: `npx vitest run __tests__/unit/lib/validations/mcp-product.test.ts __tests__/unit/lib/db/product-drafts.test.ts __tests__/unit/lib/mcp/`
Expected: PASS. Les cas story de `product-drafts.test.ts` doivent être retirés, pas contournés.

- [ ] **Step 7: Vérifier le serveur MCP en local**

```bash
npm run dev
```
Puis, dans une autre session : `claude mcp add --transport http netereka-local http://localhost:3000/api/mcp` et `/mcp`. Créer un brouillon avec `faq_html`, le relire avec `get_product_draft`, vérifier que la FAQ revient et qu'aucun champ `story` n'apparaît.

- [ ] **Step 8: Commit**

```bash
git add lib/validations/mcp-product.ts lib/db/product-drafts.ts lib/mcp/tools/products.ts __tests__/unit/lib/
git commit -m "feat(admin): remplacer story par faq_html dans le contrat MCP"
```

---

## Task 17 : Retrait de l'IA embarquée

**Files:**
- Delete: `app/(admin)/products/ai-new/`, `app/api/admin/products-ai/`, `actions/admin/products-ai.ts`, `app/(admin)/ai-settings/`, `components/admin/ai/`, `lib/ai/{client,config,product-research,image-vision-filter,submit-tool-schema,rate-limit}.ts`, `lib/validations/product-ai.ts`
- Delete: `__tests__/unit/ai/{product-research,image-vision-filter,rate-limit,image-search,submit-tool-schema,config}.test.ts`, `__tests__/unit/actions/products-ai.test.ts`
- Move: `lib/ai/image-fetch.ts` → `lib/storage/fetch-image.ts` (+ son test)
- Move: `lib/ai/image-search.ts` → `lib/media/image-search.ts` (+ son test)
- Modify: `components/admin/sidebar.tsx` (ligne 65), `app/(admin)/products/products-page-client.tsx`, `lib/db/product-drafts.ts` (import de `image-fetch`)

**Interfaces:**
- Consumes: rien.
- Produces: `fetchAndUploadImage` importable depuis `@/lib/storage/fetch-image` ; `searchImages` (ou le nom exporté actuel) depuis `@/lib/media/image-search`, lisant `BRAVE_API_KEY` dans l'environnement.

**Contexte pour l'implémenteur :** deux modules survivent au retrait et il ne faut pas les emporter dans le mouvement.

`image-fetch.ts` porte la garde SSRF, la limite de 5 Mo, le timeout de 10 s et le suivi sûr des redirections. Le MCP s'en sert pour `add_product_images` : le supprimer casse la production.

`image-search.ts` survit parce que la recherche ancre le modèle dans le réel (décision 7) — le lot B la branchera sur un outil MCP. Elle lit aujourd'hui sa clé Brave depuis la table `ai_config` ; elle doit désormais la lire dans l'environnement, ce qui la détache de la table condamnée.

`lib/ai/image-vision-filter.ts` part **sans remplacement**, et ce n'est pas une perte : il existait pour que le pipeline embarqué juge seul la pertinence des vignettes Brave, via la clé Anthropic. Avec le MCP, le client est le modèle et sa propre vision fait ce tri.

`lib/rate-limit/kv-window-limit.ts` **reste** — il sert aux commandes, au rapport CSP et aux promos. Seul `lib/ai/rate-limit.ts` part.

- [ ] **Step 1: Déplacer `image-fetch`**

```bash
git mv lib/ai/image-fetch.ts lib/storage/fetch-image.ts
git mv __tests__/unit/ai/image-fetch.test.ts __tests__/unit/lib/storage/fetch-image.test.ts
```

Mets à jour l'import dans le test et dans `lib/db/product-drafts.ts` (ligne 11) :

```ts
import { fetchAndUploadImage, type FetchImageResult } from "@/lib/storage/fetch-image";
```

Corrige le préfixe du log interne : `[ai-product] R2 upload failed for key` devient `[fetch-image] R2 upload failed for key`.

- [ ] **Step 2: Lancer les tests déplacés**

Run: `npx vitest run __tests__/unit/lib/storage/fetch-image.test.ts __tests__/unit/lib/db/`
Expected: PASS — le comportement est identique, seul le chemin change.

- [ ] **Step 3: Déplacer `image-search` et le détacher de `ai_config`**

```bash
git mv lib/ai/image-search.ts lib/media/image-search.ts
git mv __tests__/unit/ai/image-search.test.ts __tests__/unit/lib/media/image-search.test.ts
```

Dans `lib/media/image-search.ts`, remplace la lecture de la clé Brave via `getAiConfig()` par une lecture d'environnement :

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function braveApiKey(): Promise<string | null> {
  const { env } = getCloudflareContext();
  return env.BRAVE_API_KEY ?? null;
}
```

Adapte la signature de la fonction exportée si elle recevait la clé en paramètre — préfère qu'elle la lise elle-même, pour que l'outil MCP du lot B n'ait rien à lui passer. Mets le test à jour en conséquence.

- [ ] **Step 4: Lancer le test déplacé**

Run: `npx vitest run __tests__/unit/lib/media/image-search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit des déplacements, avant toute suppression**

```bash
git add lib/storage/fetch-image.ts lib/media/image-search.ts lib/db/product-drafts.ts __tests__/unit/lib/
git commit -m "refactor(admin): sortir image-fetch et image-search de lib/ai"
```

Ce commit séparé n'est pas de la coquetterie : si le retrait qui suit casse quelque chose, `git revert` sur le commit de suppression ne remet pas en cause les déplacements.

- [ ] **Step 6: Retirer les points d'entrée de l'interface**

Dans `components/admin/sidebar.tsx`, supprime la ligne 65 (`{ href: "/ai-settings", label: "Config AI", … }`) et l'import de `AiBrain01Icon` s'il n'est plus utilisé.

Dans `app/(admin)/products/products-page-client.tsx`, supprime le bouton menant à `/products/ai-new` et son import d'icône.

- [ ] **Step 7: Supprimer le pipeline**

```bash
git rm -r "app/(admin)/products/ai-new" "app/api/admin/products-ai" "app/(admin)/ai-settings" components/admin/ai
git rm actions/admin/products-ai.ts lib/validations/product-ai.ts
git rm lib/ai/client.ts lib/ai/config.ts lib/ai/product-research.ts \
       lib/ai/image-vision-filter.ts lib/ai/submit-tool-schema.ts lib/ai/rate-limit.ts
git rm -r __tests__/unit/ai
git rm __tests__/unit/actions/products-ai.test.ts
```

Si `__tests__/unit/ai/` contenait un test d'un module conservé, remets-le à sa nouvelle place au lieu de le perdre — vérifie la liste avant de valider.

- [ ] **Step 8: Vérifier qu'il ne reste rien**

```bash
npx tsc --noEmit
grep -rn "lib/ai/\|products-ai\|ai-new\|ai-settings\|getAiConfig" --include=*.ts --include=*.tsx app components lib actions __tests__
ls lib/ai 2>/dev/null
```
Expected: aucune erreur de type, aucune occurrence, et `lib/ai/` n'existe plus.

**Ne touche pas** à la table `ai_config` dans `lib/db/schema.ts` ni aux variables d'environnement de `env.d.ts` : la table part au *contract*, et retirer les variables casserait un déploiement dont les secrets sont encore définis.

- [ ] **Step 9: Lancer toute la suite**

Run: `npm run test && npm run lint && npx tsc --noEmit`
Expected: PASS partout.

- [ ] **Step 10: Vérifier que l'administration tourne**

```bash
npm run dev
```
Ouvre `/products`, `/banners`, `/dashboard`. Aucune entrée « Config AI » dans la barre latérale, aucun bouton de création assistée, aucune erreur en console.

- [ ] **Step 11: Commit**

```bash
git add -u
git add components/admin/sidebar.tsx "app/(admin)/products/products-page-client.tsx"
git commit -m "feat(admin): retirer le pipeline IA embarqué au profit du MCP"
```

---

## Après la phase 2

- [ ] Ouvrir la PR de la phase 2, la faire relire, la fusionner.
- [ ] Promouvoir via `promote.yml`.
- [ ] Vérifier en production : hero, fiche produit à quatre onglets, accordéon FAQ, administration des bannières.
- [ ] Ouvrir une issue pour la migration *contract* — elle supprimera `products.{tagline,highlights,feature_blocks,faq}`, `banners.{subtitle,badge_text,badge_color,cta_text,price}`, la table `ai_config`, ainsi que `lib/validations/product-story.ts`, `lib/utils/product-story.ts`, `components/storefront/product-story/icons.ts`, `lib/content/{icon-to-svg,story-to-html,banner-to-html,conversion-plan}.ts` et `scripts/convert-content-to-html.ts`, devenus sans objet une fois les colonnes parties. Elle devra porter le marqueur `-- migration-safety: acknowledged reason="..."`.
- [ ] Enchaîner sur le spec du lot B.
