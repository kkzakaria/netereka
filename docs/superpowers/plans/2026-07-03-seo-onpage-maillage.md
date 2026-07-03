# SEO On-Page & Maillage Interne — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir les pages catégories (texte SEO unique + meta descriptions), corriger le template de meta description produit (prix + Abidjan + COD systématiques), et densifier le maillage interne entre catégories — pour améliorer l'indexation et le positionnement de netereka.ci sur les requêtes locales (« prix abidjan », « acheter X côte d'ivoire »).

**Architecture:** Le contenu SEO des catégories vit dans un fichier de constantes versionné (`lib/seo/category-content.ts`) keyed par slug — pas de migration DB, pas de dépendance admin. La page catégorie le rend sous la grille produits et l'utilise pour la meta description. La meta description produit est extraite dans une fonction pure testable (`lib/seo/product-meta.ts`). Le maillage interne ajoute des chips « sous-catégories / catégories liées » sur les pages catégories via les helpers Drizzle existants.

**Tech Stack:** Next.js 16 App Router (RSC), TypeScript, Vitest 4, Drizzle helpers existants (`lib/db/categories.ts`).

## Global Constraints

- Scope commitlint : `seo` (enum strict — jamais `scripts`/`content`).
- Pre-commit Husky : `tsc --noEmit` + `eslint` + `vitest run` doivent passer.
- Chemins avec parenthèses (`app/(storefront)/...`) TOUJOURS quotés en bash.
- Pas de `git add -A` (dossiers AI-tools non trackés à la racine) — `git add` ciblé uniquement.
- Pas de raw SQL : uniquement les helpers existants (`getCategoryChildren`, `getTopLevelCategories`).
- Meta descriptions : 100–160 caractères. Pas de keyword stuffing ; français naturel, registre ivoirien accessible.
- Ne jamais fabriquer d'avis/notes (déjà respecté dans le code — le garder).
- Branche de travail : `feat/seo-onpage-maillage` depuis `main`.

---

### Task 1: Contenu SEO des catégories (`lib/seo/category-content.ts`)

**Files:**
- Create: `lib/seo/category-content.ts`
- Test: `__tests__/unit/category-content.test.ts`

**Interfaces:**
- Produces: `interface CategorySeoContent { metaDescription: string; heading: string; paragraphs: string[] }`, `const CATEGORY_SEO_CONTENT: Record<string, CategorySeoContent>`, `function getCategorySeoContent(slug: string): CategorySeoContent | null`. Consommé par Task 2.
- Les 20 slugs de prod (sitemap du 2026-07-03) : `smartphones, ordinateurs, tablettes, montres-connectees, ecouteurs, accessoires, jeux, televiseurs, projecteurs, imprimantes, reseau, apple, samsung, xiaomi, redmi, oppo, oneplus, huawei, nothing, quasi-neuf`.

- [ ] **Step 1: Write the failing test**

Créer `__tests__/unit/category-content.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import {
  CATEGORY_SEO_CONTENT,
  getCategorySeoContent,
} from "@/lib/seo/category-content";

const PROD_SLUGS = [
  "smartphones", "ordinateurs", "tablettes", "montres-connectees",
  "ecouteurs", "accessoires", "jeux", "televiseurs", "projecteurs",
  "imprimantes", "reseau", "apple", "samsung", "xiaomi", "redmi",
  "oppo", "oneplus", "huawei", "nothing", "quasi-neuf",
];

describe("CATEGORY_SEO_CONTENT", () => {
  it("couvre toutes les catégories de production", () => {
    for (const slug of PROD_SLUGS) {
      expect(CATEGORY_SEO_CONTENT[slug], `contenu manquant: ${slug}`).toBeDefined();
    }
  });

  it("meta descriptions entre 100 et 160 caractères", () => {
    for (const [slug, c] of Object.entries(CATEGORY_SEO_CONTENT)) {
      expect(c.metaDescription.length, `${slug}: ${c.metaDescription.length}`).toBeGreaterThanOrEqual(100);
      expect(c.metaDescription.length, `${slug}: ${c.metaDescription.length}`).toBeLessThanOrEqual(160);
    }
  });

  it("meta descriptions uniques (pas de duplicate content)", () => {
    const descs = Object.values(CATEGORY_SEO_CONTENT).map((c) => c.metaDescription);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("chaque entrée a un heading et au moins 1 paragraphe substantiel", () => {
    for (const [slug, c] of Object.entries(CATEGORY_SEO_CONTENT)) {
      expect(c.heading.length, slug).toBeGreaterThan(10);
      expect(c.paragraphs.length, slug).toBeGreaterThanOrEqual(1);
      const total = c.paragraphs.join(" ").length;
      expect(total, `${slug}: texte trop court (${total})`).toBeGreaterThanOrEqual(300);
    }
  });

  it("getCategorySeoContent retourne null pour un slug inconnu", () => {
    expect(getCategorySeoContent("inexistant")).toBeNull();
    expect(getCategorySeoContent("smartphones")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/category-content.test.ts`
Expected: FAIL — `Cannot find module '@/lib/seo/category-content'`

- [ ] **Step 3: Write the content file**

Créer `lib/seo/category-content.ts`. Contenu complet (rédigé, prêt à copier) :

```typescript
/**
 * Texte SEO éditorial par catégorie, affiché sous la grille produits
 * et utilisé comme meta description. Keyed par slug (source de vérité :
 * catégories actives en production). Une catégorie absente de cette map
 * garde le fallback générique — le site ne casse jamais.
 */
export interface CategorySeoContent {
  /** 100–160 caractères — meta description + og:description */
  metaDescription: string;
  /** H2 du bloc éditorial */
  heading: string;
  /** Paragraphes du bloc éditorial (texte brut, pas de HTML) */
  paragraphs: string[];
}

export const CATEGORY_SEO_CONTENT: Record<string, CategorySeoContent> = {
  smartphones: {
    metaDescription:
      "Achetez votre smartphone au meilleur prix en Côte d'Ivoire : iPhone, Samsung, Xiaomi, Tecno… Neufs et garantis, livraison Abidjan, paiement à la livraison.",
    heading: "Acheter un smartphone en Côte d'Ivoire au meilleur prix",
    paragraphs: [
      "Vous cherchez un téléphone neuf, garanti et au vrai prix du marché à Abidjan ? NETEREKA vous propose les dernières nouveautés — iPhone, Samsung Galaxy, Xiaomi, Redmi, OPPO, Tecno, Google Pixel — avec des prix affichés en francs CFA, sans surprise. Du smartphone à petit prix pour rester connecté au flagship dernier cri, chaque appareil est neuf, scellé et couvert par une garantie.",
      "Commandez en ligne et payez à la livraison : vous vérifiez votre téléphone avant de payer. Livraison rapide à Abidjan (Cocody, Plateau, Yopougon, Marcory et toutes les communes) et partout en Côte d'Ivoire. Besoin d'un conseil pour choisir entre deux modèles ? Notre équipe répond sur WhatsApp.",
    ],
  },
  ordinateurs: {
    metaDescription:
      "PC portables et ordinateurs de bureau neufs à Abidjan : HP, Dell, Lenovo, MacBook. Prix en FCFA, garantie, livraison rapide et paiement à la livraison.",
    heading: "Acheter un ordinateur portable ou de bureau à Abidjan",
    paragraphs: [
      "Étudiant, entrepreneur ou gamer : trouvez l'ordinateur qu'il vous faut au juste prix en Côte d'Ivoire. Notre sélection couvre les PC portables HP, Dell, Lenovo et Asus, les MacBook Apple et les ordinateurs de bureau complets avec écran — pour la bureautique, les études, le graphisme ou le jeu.",
      "Tous nos ordinateurs sont neufs et garantis, avec les caractéristiques détaillées (processeur, RAM, stockage SSD) pour comparer facilement. Paiement à la livraison : votre PC est livré chez vous à Abidjan ou dans votre ville, vous l'inspectez, puis vous payez. C'est aussi simple que ça.",
    ],
  },
  tablettes: {
    metaDescription:
      "Tablettes tactiles au meilleur prix en Côte d'Ivoire : iPad, Samsung Galaxy Tab, Xiaomi Pad. Neuves et garanties, livraison Abidjan, paiement à la livraison.",
    heading: "Acheter une tablette tactile en Côte d'Ivoire",
    paragraphs: [
      "Pour les études, le divertissement ou le travail en déplacement, la tablette est le bon compromis entre smartphone et ordinateur. Retrouvez chez NETEREKA les iPad d'Apple, les Samsung Galaxy Tab, les Xiaomi Pad et OnePlus Pad, du modèle familial abordable à la tablette pro avec stylet.",
      "Chaque tablette est neuve, scellée et garantie, avec le prix affiché en FCFA. Commandez en ligne, faites-vous livrer rapidement à Abidjan ou partout en Côte d'Ivoire, et payez uniquement à la réception.",
    ],
  },
  "montres-connectees": {
    metaDescription:
      "Montres connectées à Abidjan : Apple Watch, Galaxy Watch, Xiaomi Watch. Suivi santé et sport, prix FCFA, garantie et paiement à la livraison en Côte d'Ivoire.",
    heading: "Montres connectées au meilleur prix à Abidjan",
    paragraphs: [
      "Suivez votre santé, vos entraînements et vos notifications directement au poignet. Notre catalogue de montres connectées réunit l'Apple Watch, la Samsung Galaxy Watch, les Xiaomi Watch et les bracelets connectés abordables — pour le sport, le style ou les deux.",
      "Toutes nos montres sont neuves et garanties. Livraison rapide à Abidjan et dans toute la Côte d'Ivoire, paiement à la livraison : vous essayez, vous vérifiez, vous payez.",
    ],
  },
  ecouteurs: {
    metaDescription:
      "Écouteurs sans fil et casques audio en Côte d'Ivoire : AirPods, Galaxy Buds, JBL. Son de qualité au prix juste, livraison Abidjan, paiement à la livraison.",
    heading: "Écouteurs et casques audio en Côte d'Ivoire",
    paragraphs: [
      "AirPods d'Apple, Galaxy Buds de Samsung, casques JBL ou écouteurs à réduction de bruit : trouvez l'audio qui accompagne votre quotidien, du trajet en gbaka aux sessions de sport. Tous les produits sont authentiques, neufs et garantis — fini les contrefaçons qui lâchent au bout d'un mois.",
      "Les prix sont affichés en FCFA et vous payez à la livraison, à Abidjan comme dans les autres villes de Côte d'Ivoire.",
    ],
  },
  accessoires: {
    metaDescription:
      "Accessoires électroniques à Abidjan : chargeurs, power banks, coques, câbles, claviers. Produits authentiques, prix FCFA et paiement à la livraison en CI.",
    heading: "Accessoires électroniques : chargeurs, power banks et plus",
    paragraphs: [
      "Un bon appareil mérite de bons accessoires. Retrouvez ici les chargeurs rapides et power banks Anker, les coques et protections d'écran, les câbles certifiés, claviers, souris et hubs USB — tout ce qui prolonge et protège vos équipements au quotidien, y compris pendant les coupures.",
      "Contrairement aux accessoires de contrefaçon qui abîment vos appareils, tous nos produits sont authentiques et garantis. Livraison rapide à Abidjan et partout en Côte d'Ivoire, paiement à la réception.",
    ],
  },
  jeux: {
    metaDescription:
      "Consoles et jeux vidéo en Côte d'Ivoire : PlayStation 5, manettes et accessoires gaming. Prix en FCFA, produits neufs, livraison Abidjan, paiement à la livraison.",
    heading: "Consoles et jeux vidéo en Côte d'Ivoire",
    paragraphs: [
      "Passionné de gaming ? Retrouvez les consoles PlayStation, les manettes officielles et les accessoires gaming au prix juste à Abidjan. Que vous montiez votre premier setup ou complétiez votre collection, nos produits sont neufs, scellés et garantis.",
      "Commandez votre console en ligne et payez à la livraison : vous déballez et vérifiez avant de sortir le moindre franc. Livraison rapide dans toutes les communes d'Abidjan et en Côte d'Ivoire.",
    ],
  },
  televiseurs: {
    metaDescription:
      "Téléviseurs neufs à Abidjan : Smart TV 4K, écrans 32 à 85 pouces des grandes marques. Prix en FCFA, garantie, livraison rapide et paiement à la livraison.",
    heading: "Acheter un téléviseur à Abidjan : Smart TV et 4K",
    paragraphs: [
      "Matchs de foot, séries, Netflix ou YouTube : offrez-vous une image à la hauteur. Notre sélection de téléviseurs couvre les Smart TV connectées, les écrans 4K UHD et toutes les tailles, du 32 pouces pour la chambre au 85 pouces pour le salon familial.",
      "Chaque téléviseur est neuf, garanti, et livré avec précaution chez vous à Abidjan ou dans votre ville. Vous payez à la livraison, après avoir vérifié l'écran. Les prix sont clairs, en FCFA, sans frais cachés.",
    ],
  },
  projecteurs: {
    metaDescription:
      "Vidéoprojecteurs en Côte d'Ivoire pour cinéma maison, église ou salle de réunion. Prix FCFA, produits neufs garantis, livraison Abidjan, paiement à la livraison.",
    heading: "Vidéoprojecteurs pour la maison, l'église et le bureau",
    paragraphs: [
      "Transformez n'importe quel mur en écran géant : soirée cinéma à la maison, projection à l'église, présentation en salle de réunion ou cours en amphi. Nos vidéoprojecteurs couvrent tous les usages et tous les budgets, avec les caractéristiques détaillées (luminosité, résolution, connectique) pour bien choisir.",
      "Produits neufs et garantis, prix affichés en FCFA, livraison rapide à Abidjan et partout en Côte d'Ivoire — et comme toujours, vous payez à la réception.",
    ],
  },
  imprimantes: {
    metaDescription:
      "Imprimantes et scanners à Abidjan : jet d'encre, laser, multifonctions HP, Epson, Canon. Pour bureau et maison. Prix FCFA, paiement à la livraison en CI.",
    heading: "Imprimantes et scanners pour le bureau et la maison",
    paragraphs: [
      "Cyber, PME, école ou bureau à domicile : trouvez l'imprimante adaptée à votre volume d'impression. Jet d'encre économique, laser rapide ou multifonction avec scanner — nos modèles HP, Epson et Canon sont neufs, garantis, et sélectionnés pour leur fiabilité et le coût raisonnable des consommables.",
      "Prix transparents en FCFA, livraison rapide à Abidjan et dans toute la Côte d'Ivoire, paiement à la livraison. Une question sur la compatibilité des cartouches ? Écrivez-nous sur WhatsApp.",
    ],
  },
  reseau: {
    metaDescription:
      "Routeurs, box WiFi et équipements réseau en Côte d'Ivoire. Améliorez votre connexion à la maison ou au bureau. Prix FCFA et paiement à la livraison à Abidjan.",
    heading: "Routeurs et équipements réseau : améliorez votre connexion",
    paragraphs: [
      "Une connexion stable, ça change tout — pour le télétravail, les cours en ligne ou le streaming. Retrouvez nos routeurs WiFi, répéteurs, box 4G/5G et accessoires réseau pour couvrir toute la maison ou équiper votre bureau, même dans les zones où la fibre n'arrive pas.",
      "Matériel neuf et garanti, prix en FCFA, livraison partout en Côte d'Ivoire et paiement à la réception. Notre équipe peut vous aider à choisir selon votre opérateur et la taille de votre logement.",
    ],
  },
  apple: {
    metaDescription:
      "iPhone et produits Apple neufs en Côte d'Ivoire : iPhone 17, iPhone Air, prix officiels en FCFA. Garantie, livraison Abidjan et paiement à la livraison.",
    heading: "iPhone et produits Apple en Côte d'Ivoire",
    paragraphs: [
      "Les derniers iPhone au prix juste à Abidjan : iPhone 17, iPhone 17 Pro, iPhone Air et les générations précédentes, tous neufs, scellés et garantis — jamais de reconditionné vendu comme neuf. Les prix sont affichés en FCFA pour chaque capacité et coloris.",
      "Payez à la livraison après avoir vérifié le scellé Apple. Livraison rapide dans toutes les communes d'Abidjan et partout en Côte d'Ivoire.",
    ],
  },
  samsung: {
    metaDescription:
      "Samsung Galaxy au meilleur prix en Côte d'Ivoire : S26 Ultra, Z Flip, Galaxy A. Neufs et garantis, livraison rapide à Abidjan, paiement à la livraison.",
    heading: "Samsung Galaxy au meilleur prix à Abidjan",
    paragraphs: [
      "Du Galaxy A abordable au S26 Ultra en passant par les pliables Z Flip et Z Fold : toute la gamme Samsung, neuve et garantie, au vrai prix du marché ivoirien. Comparez les capacités et coloris directement sur chaque fiche produit, prix en FCFA affichés.",
      "Commandez en ligne, recevez votre Galaxy rapidement à Abidjan ou dans votre ville, vérifiez le scellé et payez à la livraison.",
    ],
  },
  xiaomi: {
    metaDescription:
      "Smartphones Xiaomi en Côte d'Ivoire : Xiaomi 17, 17 Ultra et plus. Le haut de gamme au prix malin, garantie, livraison Abidjan, paiement à la livraison.",
    heading: "Xiaomi en Côte d'Ivoire : la performance au prix malin",
    paragraphs: [
      "Xiaomi s'est imposé comme le meilleur rapport performance/prix du marché : photo de flagship, charge ultra-rapide et écrans AMOLED, pour bien moins cher que la concurrence. Retrouvez le Xiaomi 17, le 17 Ultra et les autres modèles de la gamme, neufs et garantis.",
      "Prix en FCFA clairement affichés, livraison rapide à Abidjan et partout en Côte d'Ivoire, paiement à la réception de votre téléphone.",
    ],
  },
  redmi: {
    metaDescription:
      "Redmi en Côte d'Ivoire : smartphones fiables à petit prix. Grande autonomie, bon appareil photo, garantie. Livraison Abidjan et paiement à la livraison.",
    heading: "Redmi : le smartphone fiable à petit prix",
    paragraphs: [
      "Besoin d'un bon téléphone sans casser la tirelire ? La gamme Redmi de Xiaomi offre de grandes batteries, des écrans lumineux et des appareils photo corrects à des prix imbattables — idéal pour un premier smartphone, un étudiant ou un téléphone de travail.",
      "Tous nos Redmi sont neufs, scellés et garantis. Livraison rapide à Abidjan et en Côte d'Ivoire, paiement uniquement à la réception.",
    ],
  },
  oppo: {
    metaDescription:
      "Smartphones OPPO en Côte d'Ivoire : Find X9, Find N6 et Reno. Design premium et photo portrait, garantie, livraison Abidjan, paiement à la livraison.",
    heading: "OPPO en Côte d'Ivoire : design et photo portrait",
    paragraphs: [
      "OPPO se distingue par ses designs soignés, sa charge rapide SuperVOOC et ses portraits réussis. Du Reno accessible au pliable Find N6 et au flagship Find X9 Ultra, retrouvez les modèles OPPO neufs et garantis au prix juste en FCFA.",
      "Livraison rapide dans toutes les communes d'Abidjan et partout en Côte d'Ivoire, paiement à la livraison après vérification.",
    ],
  },
  oneplus: {
    metaDescription:
      "OnePlus en Côte d'Ivoire : smartphones et tablettes rapides et fluides. OnePlus Pad, flagships neufs et garantis. Livraison Abidjan, paiement à la livraison.",
    heading: "OnePlus à Abidjan : la fluidité avant tout",
    paragraphs: [
      "Réputé pour ses écrans fluides, sa charge éclair et son interface épurée, OnePlus séduit ceux qui veulent un appareil rapide sans payer le prix d'un iPhone. Smartphones et tablettes OnePlus Pad, neufs, scellés et garantis.",
      "Prix affichés en FCFA, livraison rapide à Abidjan et dans toute la Côte d'Ivoire, et comme toujours chez NETEREKA : vous payez à la réception.",
    ],
  },
  huawei: {
    metaDescription:
      "Huawei en Côte d'Ivoire : smartphones photo, montres et tablettes. Excellente autonomie, produits neufs garantis. Livraison Abidjan, paiement à la livraison.",
    heading: "Huawei en Côte d'Ivoire : photo et autonomie",
    paragraphs: [
      "Huawei reste une référence pour la photo mobile et l'autonomie. Retrouvez les smartphones, montres et tablettes de la marque, neufs et garantis, avec les caractéristiques détaillées pour choisir en connaissance de cause.",
      "Prix transparents en FCFA, livraison rapide à Abidjan et partout en Côte d'Ivoire, paiement à la livraison après vérification de votre appareil.",
    ],
  },
  nothing: {
    metaDescription:
      "Nothing Phone en Côte d'Ivoire : le smartphone au design unique avec interface Glyph. Neuf, garanti, livraison rapide à Abidjan et paiement à la livraison.",
    heading: "Nothing Phone : le smartphone qui ne ressemble à aucun autre",
    paragraphs: [
      "Avec son dos transparent et son interface lumineuse Glyph, le Nothing Phone est le choix de ceux qui veulent se démarquer — sans sacrifier la performance ni la photo. Retrouvez les modèles Nothing neufs et garantis chez NETEREKA.",
      "Prix en FCFA affichés, livraison rapide à Abidjan et dans toute la Côte d'Ivoire, paiement à la réception : vous vérifiez votre téléphone avant de payer.",
    ],
  },
  "quasi-neuf": {
    metaDescription:
      "Smartphones quasi neufs vérifiés en Côte d'Ivoire : l'état du neuf, le prix en moins. Testés et garantis, livraison Abidjan, paiement à la livraison.",
    heading: "Quasi neuf : la qualité vérifiée, le prix réduit",
    paragraphs: [
      "Envie d'un haut de gamme sans le prix du neuf ? Nos appareils quasi neufs sont inspectés, testés et vendus en parfait état de fonctionnement, à des prix nettement réduits. Chaque fiche produit décrit précisément l'état de l'appareil — aucune mauvaise surprise.",
      "Contrairement au marché de l'occasion classique, vous êtes protégé : produit vérifié, garantie incluse et paiement à la livraison après inspection. Livraison rapide à Abidjan et partout en Côte d'Ivoire.",
    ],
  },
};

export function getCategorySeoContent(slug: string): CategorySeoContent | null {
  return CATEGORY_SEO_CONTENT[slug] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/category-content.test.ts`
Expected: PASS (5 tests). Si un test de longueur échoue, ajuster la meta description concernée (raccourcir/allonger) sans dénaturer le sens.

- [ ] **Step 5: Commit**

```bash
git add lib/seo/category-content.ts __tests__/unit/category-content.test.ts
git commit -m "feat(seo): add editorial SEO content for all 20 production categories"
```

---

### Task 2: Affichage du contenu SEO sur les pages catégories

**Files:**
- Modify: `app/(storefront)/c/[slug]/page.tsx` (generateMetadata lignes 42-70 + bas du JSX)

**Interfaces:**
- Consumes: `getCategorySeoContent(slug)` de Task 1.

- [ ] **Step 1: Brancher la meta description**

Dans `app/(storefront)/c/[slug]/page.tsx`, ajouter l'import :

```typescript
import { getCategorySeoContent } from "@/lib/seo/category-content";
```

Dans `generateMetadata`, remplacer :

```typescript
  const description =
    category.description ??
    `Découvrez notre sélection de ${category.name} en Côte d'Ivoire. Livraison rapide à Abidjan. Paiement à la livraison.`;
```

par :

```typescript
  const description =
    getCategorySeoContent(slug)?.metaDescription ??
    category.description ??
    `Découvrez notre sélection de ${category.name} en Côte d'Ivoire. Livraison rapide à Abidjan. Paiement à la livraison.`;
```

- [ ] **Step 2: Rendre le bloc éditorial sous la grille**

Dans le composant `CategoryPage`, récupérer le contenu (après `if (!category) notFound();`) :

```typescript
  const seoContent = getCategorySeoContent(slug);
```

Puis dans le JSX, insérer **après** le `<div className="flex gap-8">…</div>` (le layout sidebar + résultats) et **avant** la fermeture du `<div className="mx-auto max-w-7xl px-4 py-6">` :

```tsx
        {/* Texte éditorial SEO */}
        {seoContent && (
          <section
            aria-label={`À propos de la catégorie ${category.name}`}
            className="mt-14 max-w-3xl border-t pt-8"
          >
            <h2 className="text-lg font-semibold">{seoContent.heading}</h2>
            {seoContent.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        )}
```

Mettre aussi à jour le JSON-LD `CollectionPage` pour utiliser la meta enrichie :

```typescript
            description:
              seoContent?.metaDescription ??
              category.description ??
              `Découvrez notre sélection de ${category.name} en Côte d'Ivoire.`,
```

- [ ] **Step 3: Vérifier type + lint + rendu local**

Run: `npx tsc --noEmit && npx eslint "app/(storefront)/c/[slug]/page.tsx"`
Expected: 0 erreur.

Run (serveur dev déjà utilisable) : `npm run dev` puis `curl -s http://localhost:3000/c/smartphones | grep -o "Acheter un smartphone en Côte"`
Expected: la chaîne apparaît (bloc rendu).

- [ ] **Step 4: Commit**

```bash
git add "app/(storefront)/c/[slug]/page.tsx"
git commit -m "feat(seo): render category SEO text block and enriched meta descriptions"
```

---

### Task 3: Meta description produit — prix + Abidjan + COD systématiques

**Files:**
- Create: `lib/seo/product-meta.ts`
- Modify: `app/(storefront)/p/[slug]/page.tsx:44-47` (generateMetadata) et `:58` (title)
- Test: `__tests__/unit/product-meta.test.ts`

**Interfaces:**
- Produces: `function buildProductMetaDescription(name: string, price: string, shortDescription?: string | null): string`

**Problème corrigé :** quand `short_description` existe, la meta actuelle la prend telle quelle (ex. « Xiaomi 17 Ultra … – Smartphone Premium Double SIM ») et perd prix, Abidjan et paiement à la livraison — exactement les signaux des requêtes réelles (« xiaomi 17 ultra prix abidjan »).

- [ ] **Step 1: Write the failing test**

Créer `__tests__/unit/product-meta.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { buildProductMetaDescription } from "@/lib/seo/product-meta";

describe("buildProductMetaDescription", () => {
  it("sans short_description : nom + prix + signaux locaux", () => {
    const d = buildProductMetaDescription("iPhone 17 256 Go", "530 000 F CFA", null);
    expect(d).toBe(
      "Achetez iPhone 17 256 Go au prix de 530 000 F CFA en Côte d'Ivoire. Livraison rapide à Abidjan, paiement à la livraison."
    );
  });

  it("avec short_description : la conserve ET ajoute prix + signaux locaux", () => {
    const d = buildProductMetaDescription(
      "Xiaomi 17 Ultra",
      "750 000 F CFA",
      "Xiaomi 17 Ultra 5G 16Go 512Go Blanc – Smartphone Premium Double SIM"
    );
    expect(d).toContain("Smartphone Premium Double SIM");
    expect(d).toContain("750 000 F CFA");
    expect(d).toContain("Abidjan");
    expect(d).toContain("paiement à la livraison");
  });

  it("ne double pas la ponctuation finale de la short_description", () => {
    const d = buildProductMetaDescription("Test", "1 000 F CFA", "Super produit.");
    expect(d).not.toContain("..");
  });

  it("short_description vide ou espaces = fallback nom", () => {
    const d = buildProductMetaDescription("Test", "1 000 F CFA", "   ");
    expect(d).toContain("Achetez Test au prix de 1 000 F CFA");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/product-meta.test.ts`
Expected: FAIL — module inexistant.

- [ ] **Step 3: Write minimal implementation**

Créer `lib/seo/product-meta.ts` :

```typescript
/**
 * Meta description produit : garantit TOUJOURS les signaux de recherche
 * locale (prix FCFA, Abidjan, paiement à la livraison), que le produit
 * ait une short_description ou non. Motivé par les requêtes GSC réelles
 * du type « <produit> prix abidjan ».
 */
export function buildProductMetaDescription(
  name: string,
  price: string,
  shortDescription?: string | null
): string {
  const suffix = "Livraison rapide à Abidjan, paiement à la livraison.";
  const lead = shortDescription?.trim().replace(/[.\s]+$/u, "");
  if (lead) {
    return `${lead}. Prix : ${price} en Côte d'Ivoire. ${suffix}`;
  }
  return `Achetez ${name} au prix de ${price} en Côte d'Ivoire. ${suffix}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/product-meta.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Brancher dans generateMetadata produit**

Dans `app/(storefront)/p/[slug]/page.tsx`, ajouter l'import :

```typescript
import { buildProductMetaDescription } from "@/lib/seo/product-meta";
```

Remplacer :

```typescript
  const description =
    product.short_description ??
    `Achetez ${product.name} en Côte d'Ivoire. ${price}. Livraison rapide à Abidjan. Paiement à la livraison.`;
```

par :

```typescript
  const description = buildProductMetaDescription(
    product.name,
    price,
    product.short_description
  );
```

Et remplacer le title (ajout du mot-clé « Prix », présent dans les requêtes réelles) :

```typescript
    title: `${product.name} - ${price}`,
```

par :

```typescript
    title: `${product.name} - Prix ${price}`,
```

(idem pour `openGraph.title` : `` `${product.name} - Prix ${price} | ${SITE_NAME}` ``)

- [ ] **Step 6: Vérifier et committer**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

```bash
git add lib/seo/product-meta.ts __tests__/unit/product-meta.test.ts "app/(storefront)/p/[slug]/page.tsx"
git commit -m "feat(seo): product meta description always carries price, Abidjan and COD signals"
```

---

### Task 4: Maillage interne — sous-catégories et catégories liées

**Files:**
- Modify: `app/(storefront)/c/[slug]/page.tsx` (imports + data fetching + JSX)

**Interfaces:**
- Consumes: `getCategoryChildren(parentId: string): Promise<Category[]>` et `getTopLevelCategories(): Promise<Category[]>` de `lib/db/categories.ts` (existants, Drizzle).

**Contexte :** les pages produits ont déjà « Produits similaires » (8 liens). Les pages catégories, elles, n'ont AUCUN lien vers les autres catégories (sidebar = filtres marque/prix uniquement). Ce bloc crée un maillage systématique : chaque catégorie pointe vers ses sous-catégories (marques) et ses catégories sœurs → plus de chemins de crawl vers les 542 URLs.

- [ ] **Step 1: Étendre les imports et le data fetching**

Dans `app/(storefront)/c/[slug]/page.tsx`, compléter l'import existant de `lib/db/categories` :

```typescript
import {
  getCategoryBySlug,
  getCategoryAncestors,
  getCategoryDescendantIds,
  getCategoryChildren,
  getTopLevelCategories,
} from "@/lib/db/categories";
```

Dans `CategoryPage`, étendre le `Promise.all` existant :

```typescript
  const [ancestors, descendantIds, childCategories, siblingSource] = await Promise.all([
    getCategoryAncestors(category.id),
    getCategoryDescendantIds(category.id),
    getCategoryChildren(category.id),
    category.parent_id ? getCategoryChildren(category.parent_id) : getTopLevelCategories(),
  ]);

  const siblingCategories = siblingSource
    .filter((c) => c.id !== category.id)
    .slice(0, 10);
```

- [ ] **Step 2: Rendre les deux blocs de liens**

Insérer juste **avant** la section SEO éditoriale de Task 2 (même conteneur) :

```tsx
        {/* Maillage interne : sous-catégories et catégories liées */}
        {(childCategories.length > 0 || siblingCategories.length > 0) && (
          <nav aria-label="Catégories liées" className="mt-12 space-y-4">
            {childCategories.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold">
                  Affiner dans {category.name}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {childCategories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/c/${c.slug}`}
                        className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm hover:bg-accent"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {siblingCategories.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Voir aussi</h2>
                <ul className="flex flex-wrap gap-2">
                  {siblingCategories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/c/${c.slug}`}
                        className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm hover:bg-accent"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        )}
```

(`min-h-11` = 44px → respecte la contrainte touch target du design system.)

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npx eslint "app/(storefront)/c/[slug]/page.tsx" && npx vitest run`
Expected: 0 erreur, tests PASS.

Vérif visuelle : `curl -s http://localhost:3000/c/smartphones | grep -c '/c/xiaomi'`
Expected: ≥ 1 (les chips marques apparaissent).

- [ ] **Step 4: Commit**

```bash
git add "app/(storefront)/c/[slug]/page.tsx"
git commit -m "feat(seo): internal linking blocks (subcategories + sibling categories) on category pages"
```

---

### Task 5: Kit Google Business Profile

**Files:**
- Create: `docs/GBP_KIT.md`

Document prêt-à-copier pour créer la fiche Google Business Profile. Pas de code, pas de test — vérification = relecture. Contenu requis (rédigé au moment de l'exécution en réutilisant `.agents/product-marketing.md`) :

- [ ] **Step 1: Rédiger le kit complet**

Sections obligatoires, toutes remplies (pas de placeholder) :
1. **Nom de l'établissement** : `NETEREKA Electronic`
2. **Catégorie principale** : Magasin d'électronique. **Secondaires** : Magasin de téléphonie mobile, Magasin d'informatique.
3. **Description (750 car. max)** — rédigée, avec mots-clés locaux naturels (électronique, smartphones, Abidjan, paiement à la livraison).
4. **Attributs** : livraison, commande en ligne, paiement à la livraison.
5. **Services** à déclarer (livraison Abidjan + CI, conseil WhatsApp).
6. **Zone desservie** : Abidjan (communes) + grandes villes CI.
7. **3 Google Posts de lancement** (rédigés, ≤1500 car. chacun).
8. **10 questions/réponses** à pré-remplir (Q&A seeding) — livraison, garantie, COD, horaires.
9. **Checklist photos** (logo, devanture/bureau, produits, équipe).
10. **Message WhatsApp type** pour demander un avis client après livraison (les avis GBP sont un facteur de ranking local majeur).
11. **Lien site** : https://netereka.ci + UTM `?utm_source=gbp`.

- [ ] **Step 2: Commit**

```bash
git add docs/GBP_KIT.md
git commit -m "docs(seo): Google Business Profile launch kit"
```

---

### Task 6: PR et suivi

- [ ] **Step 1: Push + PR**

```bash
git push -u origin feat/seo-onpage-maillage
gh pr create --title "feat(seo): on-page category content, product meta, internal linking + GBP kit" --body "$(cat <<'EOF'
## Contexte
GSC (28j) : 12 clics, 542 URLs soumises mais quasi rien d'indexé. Le socle technique est bon ; les freins sont le contenu mince des catégories, les meta produits sans signaux locaux, et le maillage interne inexistant entre catégories.

## Changements
- Texte SEO éditorial unique pour les 20 catégories prod (`lib/seo/category-content.ts`) + rendu sous la grille + meta descriptions enrichies
- Meta description produit : prix FCFA + Abidjan + paiement à la livraison TOUJOURS présents (`lib/seo/product-meta.ts`, testé)
- Title produit : ajout du mot-clé « Prix » (aligné sur les requêtes GSC réelles)
- Maillage interne : chips sous-catégories + catégories sœurs sur toutes les pages catégories
- `docs/GBP_KIT.md` : kit complet Google Business Profile

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Rappels opérationnels** (à inclure dans le message final à l'utilisateur)

- Promouvoir le canary courant avant de merger (règle du pipeline).
- Après déploiement : demander l'indexation de 2-3 pages catégories clés dans GSC (URL Inspection → Request indexing).
- Créer la fiche GBP avec `docs/GBP_KIT.md` (action manuelle utilisateur).
- Re-vérifier GSC dans 2-3 semaines (`~/.secrets/gsc_report.py`).

---

## Self-Review

- **Spec coverage** : (1) textes catégories + meta ✅ Tasks 1-2 ; (2) meta produit ✅ Task 3 ; (3) maillage ✅ Task 4 ; (4) kit GBP ✅ Task 5.
- **Placeholders** : Task 5 décrit du contenu rédactionnel à produire à l'exécution avec toutes les sections et valeurs imposées — pas de code manquant. Tasks 1-4 : code complet.
- **Type consistency** : `CategorySeoContent`/`getCategorySeoContent` identiques Tasks 1-2 ; `buildProductMetaDescription(name, price, shortDescription)` cohérent Task 3 ; helpers `getCategoryChildren`/`getTopLevelCategories` existent dans `lib/db/categories.ts:19,25`.
