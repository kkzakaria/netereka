# Design: Amélioration Création de Bannière — Prévisualisation, Prédégradés & Sauvegarde

**Date:** 2026-02-24
**Statut:** Approuvé

## Contexte

Le formulaire de création/édition de bannière (`components/admin/banner-form.tsx`) dispose actuellement de deux color pickers HTML natifs basiques pour le dégradé de fond. Il n'y a pas de prévisualisation temps réel et pas de prédégradés.

Le rendu réel est dans `components/storefront/hero-banner.tsx` avec `linear-gradient(135deg, from, to)` + orbes décoratifs + glassmorphisme.

## Objectifs

1. **Prévisualisation temps réel** dans le formulaire admin (panel latéral sticky)
2. **6 prédégradés codés en dur** sélectionnables d'un clic
3. **Sauvegarde de dégradés personnalisés** en D1 (table dédiée), partagés entre tous les admins

## Approche retenue : État React contrôlé + table `banner_gradients`

`BannerForm` devient entièrement contrôlé (React state pour tous les champs d'apparence). Un composant `BannerPreview` reçoit les valeurs en props et se met à jour en temps réel. Un composant `GradientPicker` gère présets + sauvegarde.

## Schéma DB — table `banner_gradients`

```sql
CREATE TABLE banner_gradients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color_from TEXT NOT NULL,   -- ex: "#7C3AED"
  color_to TEXT NOT NULL,     -- ex: "#EC4899"
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Aucune FK, table autonome. Accessible à tous les admins.

Migration Drizzle : ajout dans `lib/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.

## Composants

### `GradientPicker` (nouveau — `components/admin/gradient-picker.tsx`)

Props :
```ts
interface GradientPickerProps {
  colorFrom: string;
  colorTo: string;
  savedGradients: BannerGradient[];
  onChange: (from: string, to: string) => void;
  onGradientSaved: (gradient: BannerGradient) => void;
  onGradientDeleted: (id: number) => void;
}
```

Structure UI :
- **Présets intégrés** : grille 3×2 de swatches visuels (mini dégradés 40×24px cliquables)
- **Mes dégradés** : liste des dégradés sauvegardés en D1, chacun avec bouton supprimer
- **Couleur libre** : 2 `<input type="color">` + bouton "Sauvegarder ce dégradé"
- Sauvegarder → `<Dialog>` pour nommer le dégradé → Server Action `createBannerGradient`

6 présets codés en dur :
| Nom | From | To |
|-----|------|----|
| Navy (défaut) | #183C78 | #1E4A8F |
| Violet Coucher | #7C3AED | #EC4899 |
| Vert Tropical | #059669 | #0891B2 |
| Orange Feu | #EA580C | #DC2626 |
| Nuit | #111827 | #374151 |
| Menthe Netereka | #00C47A | #183C78 |

### `BannerPreview` (nouveau — `components/admin/banner-preview.tsx`)

Props :
```ts
interface BannerPreviewProps {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: BadgeColor;
  price: number | null;
  imageUrl: string | null;
  bgFrom: string;
  bgTo: string;
  ctaText: string;
}
```

Reprend exactement le markup d'un slide `HeroBanner` (orbes, glassmorphisme, layout 2 colonnes). Affiché dans la sidebar sticky du formulaire, sous la Card "Publication". Ratio fixe `aspect-[16/9]` ou hauteur fixe `h-[200px]` pour ne pas écraser la sidebar.

### `BannerForm` refactorisé (`components/admin/banner-form.tsx`)

Conversion en formulaire contrôlé :
```ts
const [title, setTitle] = useState(banner?.title ?? "");
const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
const [ctaText, setCtaText] = useState(banner?.cta_text ?? "Découvrir");
const [badgeText, setBadgeText] = useState(banner?.badge_text ?? "");
const [badgeColor, setBadgeColor] = useState<BadgeColor>(banner?.badge_color ?? "mint");
const [bgFrom, setBgFrom] = useState(banner?.bg_gradient_from ?? "#183C78");
const [bgTo, setBgTo] = useState(banner?.bg_gradient_to ?? "#1E4A8F");
const [price, setPrice] = useState<number | null>(banner?.price ?? null);
```

Les champs non visuels (`link_url`, `display_order`, `is_active`, dates) restent non contrôlés (refs ou FormData natif) car ils n'alimentent pas la prévisualisation.

L'image reste gérée comme actuellement (upload séparé, `imagePreview` state).

Modifications layout sidebar :
```
Sidebar droite :
  [Card Publication]
  [BannerPreview — sticky]  ← nouveau
  [Button Enregistrer]
```

## Server Actions

### `createBannerGradient` (`actions/admin/banners.ts`)

```ts
export async function createBannerGradient(input: {
  name: string;
  color_from: string;
  color_to: string;
}): Promise<ActionResult & { gradient?: BannerGradient }>
```

Validation : name non vide, couleurs format hex 6 chars. Requiert `requireAdmin()`.

### `deleteBannerGradient` (`actions/admin/banners.ts`)

```ts
export async function deleteBannerGradient(id: number): Promise<ActionResult>
```

Requiert `requireAdmin()`.

## Page bannière — chargement des dégradés sauvegardés

Les pages `/banners/new` et `/banners/[id]/edit` chargent les gradients depuis D1 côté serveur (RSC) et les passent à `BannerForm` en props :

```ts
// app/(admin)/banners/new/page.tsx
const savedGradients = await getSavedGradients(); // lib/db/admin/banners.ts
return <BannerForm savedGradients={savedGradients} />;
```

`BannerForm` reçoit un nouveau prop `savedGradients: BannerGradient[]` et le passe à `GradientPicker`. Les mises à jour optimistes (après save/delete gradient) se font via `useState` local dans `BannerForm` pour éviter un refresh complet.

## Types

Nouveau type dans `lib/db/types.ts` :
```ts
export interface BannerGradient {
  id: number;
  name: string;
  color_from: string;
  color_to: string;
  created_at: string;
}
```

## Tests

- `__tests__/unit/actions/admin-banners.test.ts` : ajouter tests pour `createBannerGradient` et `deleteBannerGradient` (validation, erreurs, succès)

## Fichiers modifiés/créés

| Fichier | Action |
|---------|--------|
| `lib/db/schema.ts` | Ajouter table `banner_gradients` |
| `drizzle/` | Nouvelle migration générée |
| `lib/db/types.ts` | Ajouter `BannerGradient` interface |
| `lib/db/admin/banners.ts` | Ajouter `getSavedGradients()` |
| `actions/admin/banners.ts` | Ajouter `createBannerGradient`, `deleteBannerGradient` |
| `components/admin/gradient-picker.tsx` | Nouveau composant |
| `components/admin/banner-preview.tsx` | Nouveau composant |
| `components/admin/banner-form.tsx` | Refactoriser en contrôlé + intégrer les deux nouveaux composants |
| `app/(admin)/banners/new/page.tsx` | Passer `savedGradients` |
| `app/(admin)/banners/[id]/edit/page.tsx` | Passer `savedGradients` |
| `__tests__/unit/actions/admin-banners.test.ts` | Ajouter tests |
