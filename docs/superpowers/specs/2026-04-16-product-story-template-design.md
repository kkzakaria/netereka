# Product Story — Template de description produit Apple-like

**Date** : 2026-04-16
**Statut** : Approuvé (brainstorming)
**Auteur** : Claude + @kkzakaria

## Contexte

Actuellement, la description produit est un unique champ rich text (`products.description`, Lexical JSON) rendu via `ProductDetails` (`components/storefront/product-details.tsx`). Selon que des caractéristiques (attributs) existent ou non, le bloc est :

- une section plate avec un `<div className="prose prose-sm max-w-prose dark:prose-invert">`,
- ou le contenu d'un onglet `Description` aux côtés d'un onglet `Caractéristiques`.

Conséquences :

- Le rendu dépend entièrement de ce que l'admin saisit dans l'éditeur Lexical : aucune garantie de cohérence visuelle d'un produit à l'autre.
- Aucun storytelling structuré (accroche, points forts, feature blocks, FAQ), ce qui pénalise la perception de qualité et la conversion sur un marché où la fiche produit est souvent le principal argument de vente.
- La zone description est enfouie sous la galerie, dans un onglet, ce qui écrase toute volonté éditoriale.

## Objectif

Fournir un **template structuré et stylisé** qui s'applique à **toute description produit**, produit un rendu soigné / élégant / moderne de type *Apple product page*, et garantit la cohérence visuelle entre produits — tout en restant facile à remplir côté admin et en ne cassant aucune description existante.

## Décisions structurantes

| Dimension | Choix | Raison |
|---|---|---|
| Approche | Template **structuré** (schéma imposé, pas simple stylisation) | Garantit cohérence visuelle et storytelling quel que soit l'admin qui saisit |
| Direction visuelle | **Apple-like** (éditorial premium) | Silencieux, luxueux, typographie généreuse, pas de cards ni bordures |
| Placement sur la page | **Section pleine largeur** sous la galerie (sortie du `max-w-7xl`) | Le storytelling devient un scroll dédié, pas un onglet enfoui |
| Blocs retenus | Tagline (A), Highlights (B), Feature blocks (C), FAQ optionnel (F), Zone libre (I) | Menu validé au brainstorming ; A+B+C portent le style éditorial, F = contenu produit spécifique, I = fallback legacy + contenu additionnel |
| Blocs écartés | Dans la boîte (D), Garantie/support (E), Comparaison (G), Vidéo (H) | Out of scope MVP ; peuvent être ajoutés plus tard comme blocs supplémentaires sans casser le schéma |
| Disposition feature blocks | **Zig-zag** (alternance image gauche/droite) | Pattern Apple signature, rythme visuel |
| Image feature block | **Optionnelle** | Si absente, texte centré pleine largeur |
| Grille highlights | **3 colonnes** (wrap 2 puis 1 sur mobile), icône au-dessus / label en dessous, centré | Style éditorial Apple-like |
| FAQ | **Accordéon** shadcn (tout replié par défaut) | Évite d'alourdir la page avec 5 questions déployées |
| Stratégie de migration | **Bascule progressive, aucune migration de données** | L'ancienne `description` reste en place et nourrit le bloc *Zone libre* ; l'admin enrichit produit par produit |
| Icon picker | Shortlist curatée de ~50 icônes Hugeicons | Rapidité de sélection + cohérence visuelle (vs 8 000 icônes) |
| Onglets Description/Caractéristiques | **Supprimés** | La Story occupe sa propre section pleine largeur ; les attributs deviennent une section séparée en dessous |

## Architecture cible de la page produit

Ordre vertical final :

```text
[ Fil d'Ariane ]
[ Galerie image  |  Nom + Prix + Add to cart + Wishlist + WhatsApp ]
[ SECTION PRODUCT STORY (pleine largeur) ]
    [ Tagline ]            ← optionnel
    [ Highlights ]         ← optionnel
    [ Feature block 1 ]    ← optionnel
    [ Feature block 2 ]
    [ … ]
    [ FAQ ]                ← optionnel
    [ Zone libre ]         ← prose Lexical, affiche aussi la description legacy
[ Section Caractéristiques (grille clé/valeur actuelle) ]  ← contraint au max-w-7xl
[ Avis clients ]
[ Produits similaires ]
```

La section *Product Story* **ne rend rien** si tous les blocs sont vides (pas de section fantôme). Idem pour chaque sous-bloc individuellement.

## Modèle de données

Nouvelles colonnes sur `products` (migration Drizzle, 100% backward compatible, expand-only) :

| Colonne | Type | Nullable | Contenu |
|---|---|---|---|
| `tagline` | `text` | oui | Phrase d'accroche éditoriale |
| `highlights` | `text` (JSON) | oui | `Array<{ icon: string, label: string }>` |
| `feature_blocks` | `text` (JSON) | oui | `Array<{ title: string, body: string, image_url?: string, image_alt?: string }>` |
| `faq` | `text` (JSON) | oui | `Array<{ question: string, answer: string }>` |

**Colonnes existantes conservées inchangées** :

- `description` + `description_type` → désormais considérés comme la source du **bloc Zone libre**. Aucune migration de données n'est nécessaire : toute description legacy continue à s'afficher (mais au sein de la nouvelle section Story).
- `short_description` → continue à alimenter le SEO / meta description, pas affiché dans la Story.

**TypeScript** (`lib/db/types.ts`) :

```ts
export interface ProductHighlight {
  icon: string;     // nom d'une icône Hugeicons de la shortlist
  label: string;    // ≤ 80 car.
}

export interface ProductFeatureBlock {
  title: string;    // ≤ 120 car.
  body: string;     // ≤ 600 car.
  image_url?: string | null;
  image_alt?: string | null;
}

export interface ProductFaqItem {
  question: string; // ≤ 160 car.
  answer: string;   // ≤ 600 car.
}

// Ajouts à l'interface Product :
export interface Product {
  // … champs existants …
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  feature_blocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
}
```

Les champs JSON sont désérialisés côté query helpers (`lib/db/products.ts`). En cas de JSON malformé en base (ne devrait jamais arriver, la saisie passe par le form admin) : log + traité comme `null`.

### Limites de saisie

Validées avec Zod dans `lib/validations/product-story.ts` et appliquées à la fois côté admin (form) et côté Server Action.

| Champ | Limite |
|---|---|
| `tagline` | ≤ 200 caractères |
| `highlights` | 3 à 6 items ; `label` ≤ 80 car. |
| `feature_blocks` | 2 à 4 items ; `title` ≤ 120 car. ; `body` ≤ 600 car. |
| `faq` | 0 à 5 items ; `question` ≤ 160 car. ; `answer` ≤ 600 car. |
| Icônes highlights | Doivent appartenir à la shortlist curatée |

Ces mins/max s'appliquent **quand le bloc est activé**. Un admin peut laisser le bloc `highlights` à `null` (donc non affiché) ; il ne peut pas saisir 1 ou 2 highlights (on refuse) — c'est 3 min ou 0 (= bloc désactivé). Même logique pour feature blocks (0 ou 2–4).

## Rendu storefront

Nouveau répertoire `components/storefront/product-story/` :

```text
product-story/
├── index.tsx                    # composant racine, gère le "rien à afficher"
├── story-tagline.tsx
├── story-highlights.tsx
├── story-feature-block.tsx
├── story-faq.tsx
├── story-free-content.tsx       # wrap le rendu Lexical existant
└── icons.ts                     # shortlist Hugeicons + mapping string → composant
```

### `<ProductStory>` (racine)

- `<section>` **sortie du `max-w-7xl`** pour occuper toute la largeur viewport. Techniquement : le `ProductStory` est rendu **hors** du conteneur `<div className="mx-auto max-w-7xl px-4 py-6">` de `app/(storefront)/p/[slug]/page.tsx`. La page produit est donc réorganisée pour séparer (a) l'encart hero contraint à `max-w-7xl`, (b) `ProductStory` pleine largeur, (c) les caractéristiques / reviews / related reprenant le `max-w-7xl`.
- Si tous les blocs (tagline, highlights, feature_blocks, faq, free content) sont vides → retourne `null`.
- Backgrounds alternés : bloc impair `bg-background`, bloc pair `bg-muted/30`. Les blocs en transparence (tagline + highlights) peuvent partager le même fond ; on alterne **entre feature blocks** pour créer le rythme visuel.
- Padding vertical par bloc : `py-16 sm:py-24`.

### `<StoryTagline>`

```tsx
<div className="mx-auto max-w-[800px] px-6 text-center">
  <p className="text-4xl font-light leading-tight tracking-tight sm:text-5xl lg:text-6xl">
    {tagline}
  </p>
</div>
```

### `<StoryHighlights>`

```tsx
<div className="mx-auto max-w-6xl px-6">
  <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3">
    {highlights.map((h) => (
      <div key={h.label} className="flex flex-col items-center text-center">
        <HugeiconsIcon icon={resolveIcon(h.icon)} size={40} strokeWidth={1.5} />
        <p className="mt-4 text-base font-medium">{h.label}</p>
      </div>
    ))}
  </div>
</div>
```

Couleur icône : `text-foreground` par défaut (noble, cohérent avec le mood Apple-like). La mint green (`#00FF9C`) n'est pas utilisée ici — elle reste réservée aux CTA d'achat (préserve sa force).

### `<StoryFeatureBlock>`

```tsx
<div className="mx-auto max-w-6xl px-6">
  <div
    className={cn(
      "grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16 items-center",
      // zig-zag : l'index pair garde image à gauche, l'index impair inverse
      indexIsOdd && "md:[&>*:first-child]:order-2",
    )}
  >
    {image_url && (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
        <Image src={image_url} alt={image_alt ?? ""} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </div>
    )}
    <div className={cn("space-y-4", !image_url && "mx-auto max-w-2xl text-center")}>
      <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h3>
      <p className="text-lg leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  </div>
</div>
```

- Mobile (< `md`) : grid s'effondre en une colonne, image toujours au-dessus du texte.
- Si `image_url` est absent : le texte prend toute la largeur centrée (max-w-2xl).

### `<StoryFaq>`

S'appuie sur `Accordion` de shadcn (`components/ui/accordion.tsx`, à ajouter via `npx shadcn add accordion` si absent).

```tsx
<div className="mx-auto max-w-3xl px-6">
  <h2 className="mb-8 text-3xl font-semibold tracking-tight">Questions fréquentes</h2>
  <Accordion type="single" collapsible>
    {faq.map((item, i) => (
      <AccordionItem key={i} value={`item-${i}`}>
        <AccordionTrigger className="text-left text-lg">{item.question}</AccordionTrigger>
        <AccordionContent className="text-base leading-relaxed">{item.answer}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
</div>
```

### `<StoryFreeContent>`

Wrap minimal autour du rendu prose existant pour le resituer dans le rythme de la section :

```tsx
<div className="mx-auto max-w-3xl px-6">
  <div
    className="prose prose-lg max-w-none dark:prose-invert"
    dangerouslySetInnerHTML={{ __html: descriptionToHtml(description, descriptionType) }}
  />
</div>
```

Passage de `prose-sm` à `prose-lg` pour rester cohérent avec la typographie généreuse de la section. Aucun changement à `descriptionToHtml` ni à `lexical-to-html` : toutes les descriptions existantes s'affichent telles quelles.

### Shortlist Hugeicons (~50 icônes)

Dans `components/storefront/product-story/icons.ts` : un objet `HIGHLIGHT_ICONS: Record<string, IconSvgElement>` qui map un nom canonique (ex. `"battery"`, `"camera"`, `"wifi"`, `"shield"`, `"flash"`, `"cpu"`, `"display"`, `"bluetooth"`, `"volume"`, `"sd-card"`, `"weight"`, `"ruler"`, `"water-resistant"`, `"charge-fast"`, `"star"`, `"gift"`, `"truck"`, `"package"`, …) vers un composant Hugeicons.

La fonction `resolveIcon(name)` retourne l'icône demandée ou une icône de fallback (`Star01Icon`) si le nom ne fait pas partie de la shortlist. Côté admin, le picker ne permet de sélectionner que des noms de la shortlist, donc ce fallback ne devrait jamais être atteint en prod — mais il nous protège si on dépublie une icône sans purger les produits.

Liste complète des 50 icônes fournie en annexe du plan d'implémentation (pour éviter de polluer ce spec).

## Admin editor UX

Nouvel **onglet "Story"** dans la page admin produit (`app/(admin)/admin/products/[id]/page.tsx`), à côté de l'onglet "Informations" déjà présent.

### Structure du form

- **Tagline** : `<Textarea>` + compteur `{count}/200`
- **Points forts (Highlights)** :
  - Liste éditable (ajouter, supprimer, réordonner par drag-and-drop — utiliser `@dnd-kit` si pas déjà présent, sinon une réorganisation par boutons ↑/↓ suffit)
  - Chaque item : popover picker d'icône (grille visuelle des 50 icônes) + input label
  - Contrainte 3 à 6 items, message d'erreur clair si < 3 (« Ajoute au moins 3 points forts ou laisse le bloc vide »)
- **Feature blocks** :
  - Liste éditable, 2 à 4 blocs
  - Chaque bloc : input `title`, `<Textarea>` `body` (avec compteur), zone upload image (drop-zone + bouton, upload direct R2 via `lib/storage/images.ts`, avec preview), input `image_alt`
- **FAQ** :
  - Liste éditable, 0 à 5 items (entièrement optionnel)
  - Chaque item : input `question`, `<Textarea>` `answer`
- **Description libre** : l'éditeur Lexical existant (`components/admin/rich-text-editor.tsx`), inchangé, avec juste un label clarifié (« Contenu complémentaire »).
- **Bouton "Aperçu"** en haut de l'onglet : ouvre `/p/{slug}` dans un nouvel onglet (le contenu publié, donc non-previsualisation de la saisie en cours — voir *Open questions*).

### Server Action

`actions/admin/products.ts` :

- La Server Action `updateProduct` accepte les nouveaux champs `tagline`, `highlights`, `feature_blocks`, `faq`.
- Validation Zod via `product-story.ts`.
- Sérialisation JSON des champs `highlights` / `feature_blocks` / `faq` avant INSERT/UPDATE.
- En cas de `fieldErrors` retournés, le form affiche les erreurs par champ comme les autres formulaires admin.

## Migration & rollout

1. **Migration Drizzle** `drizzle/XXXX_product_story_blocks.sql` : `ALTER TABLE products ADD COLUMN tagline TEXT; ADD COLUMN highlights TEXT; ADD COLUMN feature_blocks TEXT; ADD COLUMN faq TEXT;` — toutes nullables.
2. **Expand-only** → compatible avec le contrôle de sécurité `scripts/check-migration-safety.mjs`. Aucun marker d'acknowledge nécessaire.
3. Déploiement : PR → merge → canary 10% → promote (pipeline standard).
4. **Aucune migration de données** : les produits existants rendent leur ancienne `description` via le bloc *Zone libre*, exactement comme avant (à la classe `prose-sm` → `prose-lg` près).
5. **Plan de curation** : l'équipe enrichit les top-ventes en priorité, produit par produit, après le déploiement. Hors scope de cette PR.

## Stratégie de test

- **Unit tests** (Vitest) :
  - `lib/validations/product-story.ts` : validation Zod (limites min/max, icônes valides, JSON bien typé).
  - `lib/db/products.ts` : désérialisation JSON (cas normal + JSON malformé → `null` + log).
  - `components/storefront/product-story/*` : snapshot + rendu conditionnel (tous vides → `null`, chaque bloc seul → rendu, combinaisons).
- **Tests d'intégration** de la page produit : au moins un produit legacy (pas de champs Story) et un produit enrichi (tous les blocs) doivent render sans erreur.
- **Visual check** manuel : poste un produit de test sur preview Cloudflare avec tous les blocs remplis + image, vérifier rendu mobile + desktop.

## Impact & risques

- **Backward compatibility** : ✅ les descriptions existantes continuent à s'afficher sans aucune intervention.
- **SEO** : ✅ `short_description` et `description` restent utilisés pour la meta et le schema.org ; pas de changement côté indexation. Le schema.org Product peut ensuite (phase 2) être enrichi avec les `faq` en `FAQPage` pour Rich Results → hors scope MVP.
- **Perf** : +4 colonnes nullables sur `products`, impact négligeable. Les JSON sont petits (quelques centaines d'octets par produit max). Les images feature block utilisent déjà `next/image` + R2.
- **Risque 1 — Friction admin** : le form devient plus riche. Mitigation : tous les blocs sont optionnels, l'admin peut publier un produit avec zéro bloc Story et conserver l'ancienne description.
- **Risque 2 — Icônes manquantes** : si on supprime une icône de la shortlist sans purger les produits, le fallback affiche une étoile. Mitigation : code-review de toute modification de `icons.ts`.

## Questions ouvertes (à trancher dans le plan d'implémentation)

1. **Preview admin live** : pour le MVP, le bouton "Aperçu" ouvre la page publique (= dernière version publiée). Une vraie preview WYSIWYG de la saisie en cours est coûteuse et peut être une itération future.
2. **Drag-and-drop vs flèches ↑/↓** : si `@dnd-kit` n'est pas déjà installé, on commence par des flèches. La réorganisation est rarement utilisée et l'expérience flèches reste correcte.
3. **FAQ en JSON-LD `FAQPage`** : hors scope MVP, à traiter dans une PR SEO dédiée après la sortie du template.

## Annexes (dans le plan d'implémentation)

- Liste complète des 50 icônes Hugeicons retenues
- Mapping exact des noms canoniques vers les composants Hugeicons
- Exemples de saisie pour 2–3 catégories (smartphone, TV, accessoire)
