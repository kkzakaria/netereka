# Design — Filtre marques amélioré

**Date :** 2026-02-26
**Contexte :** Pages catégorie et recherche — sidebar desktop + bottom sheet mobile

## Problème

La liste des marques dans `SearchFilters` affiche toutes les marques sans limite. Sur des catégories avec de nombreuses marques, cela crée une sidebar très longue et une mauvaise expérience utilisateur.

## Solution

Tronquer la liste à 5 marques par défaut avec un bouton d'expansion qui révèle la liste complète accompagnée d'un input de recherche.

## Comportement détaillé

### État replié (défaut)
- Affiche les 5 premières marques de la liste en checkboxes
- Les marques déjà sélectionnées (actives) sont toujours visibles, même si elles sont hors du top 5
- Si des marques supplémentaires existent → bouton `+ N marques` (N = nombre de marques cachées)

### État déplié
- Input de recherche auto-focusé pour filtrer la liste par nom (case-insensitive, contains)
- Toutes les marques sont affichées, filtrées par la saisie
- Bouton `Voir moins` pour replier (réinitialise aussi le champ de recherche)

## Architecture

### Nouveau composant

`app/(storefront)/search/brand-filter.tsx` — composant client extrait

**Props :**
```ts
interface BrandFilterProps {
  brands: string[];
  activeBrands: string[];
  onToggle: (brand: string) => void;
}
```

**State local :**
- `expanded: boolean` — replié par défaut
- `search: string` — vide par défaut

**Logique `visibleBrands` :**
- Replié : top 5 + actives hors top 5 (dédupliqué)
- Déplié : toutes les marques filtrées par `search`

### Modification de `SearchFilters`

Remplacer le bloc `<fieldset>` marques existant par `<BrandFilter>` en lui passant `brands`, `activeBrands` et `onToggle`.

## Périmètre

### Inclus
- Composant `BrandFilter`
- Modification de `SearchFilters` pour l'utiliser

### Exclus (non touchés)
- `filter-context.tsx`
- `active-filters.tsx`
- `mobile-filter-sheet.tsx`
- `search-sort.tsx`
- Logique URL params (inchangée)
- Page catégorie `app/(storefront)/c/[slug]/page.tsx`
