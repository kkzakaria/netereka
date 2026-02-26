# Design — Filtre prix combiné (slider + inputs)

**Date :** 2026-02-26
**Contexte :** Pages catégorie et recherche — sidebar desktop + bottom sheet mobile

## Problème

Le filtre prix actuel utilise deux `<Input type="number">` sans retour visuel. Sur de grandes plages (ex. 5 000 — 850 000 FCFA), l'utilisateur doit deviner les valeurs à saisir.

## Solution

Remplacer les inputs seuls par un slider double poignée (shadcn Slider) accompagné de deux inputs numériques. Le slider donne le ressenti visuel, les inputs permettent la précision.

## UX

```
Prix
────
[━━━●━━━━━━━━━━━●━━]  ← slider double poignée
[ 15 000 ] — [ 200 000 ]  FCFA
```

- **Slider → inputs** : déplacer une poignée met à jour l'input correspondant immédiatement, puis déclenche un debounce 500ms pour la mise à jour URL.
- **Input → slider** : saisir une valeur clamp la valeur à `[priceRange.min, localMax]` ou `[localMin, priceRange.max]`, met à jour le slider, puis debounce URL.
- Pas de bouton "Appliquer" — tout est live avec debounce (comportement existant conservé).
- Sync externe : si l'URL change sans interaction utilisateur (ex. "Réinitialiser les filtres"), les valeurs locales se réinitialisent.

## Architecture

### Dépendance à installer

```bash
npx shadcn@latest add slider
```

Installe `components/ui/slider.tsx` (Radix `@radix-ui/react-slider`, déjà utilisé par le projet).

### Nouveau composant

`app/(storefront)/search/price-filter.tsx` — composant client extrait

**Props :**
```ts
interface PriceFilterProps {
  priceRange: { min: number; max: number };
  activeMin: string;  // valeur URL actuelle (ou "")
  activeMax: string;  // valeur URL actuelle (ou "")
  onUpdate: (min: string | null, max: string | null) => void;
}
```

**State local :**
- `localMin: number` — valeur courante du min (initialisée depuis activeMin ou priceRange.min)
- `localMax: number` — valeur courante du max (initialisée depuis activeMax ou priceRange.max)

**Logique de sync externe :**
Comparer les valeurs locales aux valeurs URL à chaque render. Si différentes (changement externe), réinitialiser le state local. Même pattern que le filtre prix actuel dans `SearchFilters`.

### Modification de `SearchFilters`

- Supprimer le state `priceState` et `priceTimerRef` actuels
- Supprimer `handlePriceChange`
- Remplacer le bloc `<fieldset>` prix par `<PriceFilter priceRange={priceRange} activeMin={activeMinPrice} activeMax={activeMaxPrice} onUpdate={(min, max) => updateParams({ min_price: min, max_price: max })} />`

## Périmètre

### Inclus
- Installation shadcn Slider
- Composant `PriceFilter`
- Modification de `SearchFilters` (suppression ancien prix, ajout PriceFilter)

### Exclus (non touchés)
- `filter-context.tsx`
- `active-filters.tsx`
- `mobile-filter-sheet.tsx`
- `brand-filter.tsx`
- Pages catégorie et recherche
