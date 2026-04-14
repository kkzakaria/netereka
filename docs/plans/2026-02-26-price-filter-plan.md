# Price Filter — Slider + Inputs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les deux inputs texte du filtre prix par un slider double poignée + inputs synchronisés pour une UX plus intuitive.

**Architecture:** Nouveau composant `PriceFilter` extrait de `SearchFilters`. Le slider (shadcn/Radix) contrôle la plage visuellement ; les inputs permettent la saisie précise (mise à jour sur blur). Les deux se synchronisent mutuellement. La mise à jour URL reste debounced à 500ms comme aujourd'hui. `SearchFilters` perd tout son state prix — il délègue entièrement à `PriceFilter`.

**Tech Stack:** Next.js App Router, React, Tailwind CSS 4, shadcn/ui Slider (`@radix-ui/react-slider`), `formatPrice` utilitaire existant.

---

### Task 1: Créer la branche

**Files:** (aucun fichier)

**Step 1: Créer et basculer sur la branche**

```bash
git checkout -b feat/price-filter-slider
```

Expected: `Switched to a new branch 'feat/price-filter-slider'`

---

### Task 2: Installer le composant shadcn Slider

**Files:**
- Create: `components/ui/slider.tsx` (généré par shadcn)

**Step 1: Lancer l'installation**

```bash
npx shadcn@latest add slider --yes
```

Expected: le fichier `components/ui/slider.tsx` est créé.

**Step 2: Vérifier que le fichier existe**

```bash
ls components/ui/slider.tsx
```

Expected: fichier listé.

**Step 3: Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

---

### Task 3: Créer le composant `PriceFilter`

**Files:**
- Create: `app/(storefront)/search/price-filter.tsx`

**Step 1: Créer le fichier**

Créer `app/(storefront)/search/price-filter.tsx` avec ce contenu exact :

```tsx
"use client";

import { useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils/format";

interface PriceFilterProps {
  priceRange: { min: number; max: number };
  activeMin: string;
  activeMax: string;
  onUpdate: (min: string | null, max: string | null) => void;
}

function parsePrice(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function PriceFilter({ priceRange, activeMin, activeMax, onUpdate }: PriceFilterProps) {
  const initMin = parsePrice(activeMin, priceRange.min);
  const initMax = parsePrice(activeMax, priceRange.max);

  const [localMin, setLocalMin] = useState(initMin);
  const [localMax, setLocalMax] = useState(initMax);
  // Separate string state allows free typing in inputs without clamping mid-entry.
  const [minInput, setMinInput] = useState(String(initMin));
  const [maxInput, setMaxInput] = useState(String(initMax));
  // Track last URL values to detect external resets (e.g. "Réinitialiser les filtres").
  const [prevActive, setPrevActive] = useState({ min: activeMin, max: activeMax });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync when URL changes externally without user interaction.
  // Called during render (not useEffect) to avoid a one-frame flash of stale values.
  if (prevActive.min !== activeMin || prevActive.max !== activeMax) {
    const newMin = parsePrice(activeMin, priceRange.min);
    const newMax = parsePrice(activeMax, priceRange.max);
    setPrevActive({ min: activeMin, max: activeMax });
    setLocalMin(newMin);
    setLocalMax(newMax);
    setMinInput(String(newMin));
    setMaxInput(String(newMax));
  }

  function scheduleUpdate(min: number, max: number) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate(
        min !== priceRange.min ? String(min) : null,
        max !== priceRange.max ? String(max) : null,
      );
    }, 500);
  }

  function handleSliderChange([min, max]: number[]) {
    setLocalMin(min);
    setLocalMax(max);
    setMinInput(String(min));
    setMaxInput(String(max));
    scheduleUpdate(min, max);
  }

  function handleMinBlur() {
    const clamped = Math.max(priceRange.min, Math.min(parsePrice(minInput, priceRange.min), localMax));
    setLocalMin(clamped);
    setMinInput(String(clamped));
    scheduleUpdate(clamped, localMax);
  }

  function handleMaxBlur() {
    const clamped = Math.min(priceRange.max, Math.max(parsePrice(maxInput, priceRange.max), localMin));
    setLocalMax(clamped);
    setMaxInput(String(clamped));
    scheduleUpdate(localMin, clamped);
  }

  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Prix
      </legend>
      <Slider
        min={priceRange.min}
        max={priceRange.max}
        step={500}
        value={[localMin, localMax]}
        onValueChange={handleSliderChange}
        className="mb-4"
      />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          aria-label="Prix minimum"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={handleMinBlur}
          min={priceRange.min}
          max={priceRange.max}
          className="h-8 text-xs"
        />
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">—</span>
        <Input
          type="number"
          aria-label="Prix maximum"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={handleMaxBlur}
          min={priceRange.min}
          max={priceRange.max}
          className="h-8 text-xs"
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {formatPrice(priceRange.min)} — {formatPrice(priceRange.max)}
      </p>
    </fieldset>
  );
}
```

**Step 2: Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

---

### Task 4: Intégrer `PriceFilter` dans `SearchFilters`

**Files:**
- Modify: `app/(storefront)/search/search-filters.tsx`

Voici l'état actuel complet du fichier (130 lignes). Les modifications sont décrites ci-dessous.

**Step 1: Remplacer le contenu du fichier**

Le nouveau contenu de `app/(storefront)/search/search-filters.tsx` doit être :

```tsx
"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategorySidebar } from "@/components/storefront/category-sidebar";
import { useFilterData } from "./filter-context";
import { BrandFilter } from "./brand-filter";
import { PriceFilter } from "./price-filter";

export function SearchFilters() {
  const { categoryTree, activeCategorySlug, brands, priceRange, basePath } = useFilterData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeBrands = searchParams.get("brand")?.split(",").filter(Boolean) ?? [];
  const activeMinPrice = searchParams.get("min_price") ?? "";
  const activeMaxPrice = searchParams.get("max_price") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath]
  );

  const handleBrandToggle = (brand: string) => {
    const next = activeBrands.includes(brand)
      ? activeBrands.filter((b) => b !== brand)
      : [...activeBrands, brand];
    updateParams({ brand: next.length > 0 ? next.join(",") : null });
  };

  const handleReset = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`${basePath}?${params.toString()}`);
  };

  const hasFilters = activeBrands.length > 0 || activeMinPrice || activeMaxPrice;

  return (
    <div className="space-y-6">
      {/* Category tree sidebar */}
      <CategorySidebar
        categoryTree={categoryTree}
        activeCategorySlug={activeCategorySlug}
      />

      {/* Brands */}
      <BrandFilter
        brands={brands}
        activeBrands={activeBrands}
        onToggle={handleBrandToggle}
      />

      {/* Price range */}
      <PriceFilter
        priceRange={priceRange}
        activeMin={activeMinPrice}
        activeMax={activeMaxPrice}
        onUpdate={(min, max) => updateParams({ min_price: min, max_price: max })}
      />

      {/* Reset */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
```

Ce qui change par rapport à l'actuel :
- **Supprimé** : `useState`, `useRef` imports, `Input` import, `formatPrice` import
- **Supprimé** : `priceState`, `priceTimerRef` state
- **Supprimé** : le bloc de sync externe prix (lignes 24-29 actuel)
- **Supprimé** : `handlePriceChange` function
- **Supprimé** : le `<fieldset>` Prix avec ses deux `<Input>`
- **Ajouté** : import `PriceFilter`
- **Ajouté** : `<PriceFilter>` avec les props
- **Ajouté** : `type="button"` sur le bouton reset (bonne pratique)

**Step 2: Vérifier tsc**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

---

### Task 5: Vérifier types, lint, et tests

**Step 1: TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

**Step 2: Lint**

```bash
npm run lint
```

Expected: aucune erreur.

**Step 3: Tests**

```bash
npm run test
```

Expected: tous les tests passent (422 tests, composants React non couverts par les tests unitaires existants).

---

### Task 6: Commit et PR

**Step 1: Stager les fichiers**

```bash
git add "app/(storefront)/search/price-filter.tsx" "app/(storefront)/search/search-filters.tsx" components/ui/slider.tsx
```

**Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(filters): replace price inputs with dual-handle slider + inputs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 3: Push**

```bash
git push -u origin feat/price-filter-slider
```

**Step 4: Créer la PR**

```bash
gh pr create \
  --title "feat(filters): replace price inputs with dual-handle slider + inputs" \
  --body "$(cat <<'EOF'
## Summary
- Installe le composant shadcn Slider (Radix-based)
- Nouveau composant `PriceFilter` : slider double poignée + deux inputs synchronisés
- Slider → met à jour les inputs immédiatement + debounce URL 500ms
- Inputs → saisie libre, clamp + sync slider sur blur + debounce URL
- Réinitialisation externe (\"Réinitialiser les filtres\") correctement synchronisée
- `SearchFilters` nettoyé : suppression du state prix, de l'import `Input` et `formatPrice`

## Test plan
- [ ] Déplacer le slider min → l'input min se met à jour immédiatement
- [ ] Déplacer le slider max → l'input max se met à jour immédiatement
- [ ] Saisir une valeur dans l'input min, tabber → le slider se repositionne
- [ ] Saisir une valeur min > max, tabber → clamp à localMax
- [ ] Saisir une valeur max < min, tabber → clamp à localMin
- [ ] Cliquer \"Réinitialiser les filtres\" → slider et inputs reviennent à priceRange.min/max
- [ ] Vérifier sur mobile (bottom sheet) : comportement identique
- [ ] Vérifier que les chips de filtre actifs s'affichent correctement

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
