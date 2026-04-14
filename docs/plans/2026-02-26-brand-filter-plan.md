# Brand Filter Improvement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer la liste plate de marques par un composant tronqué à 5 entrées avec expansion et recherche inline.

**Architecture:** Nouveau composant `BrandFilter` extrait depuis `SearchFilters`. State local uniquement (`expanded`, `search`). Aucun changement au contexte, aux URL params, ni aux autres composants de filtre.

**Tech Stack:** Next.js App Router, React, Tailwind CSS 4, HugeIcons

---

### Task 1: Créer la branche

**Files:**
- (aucun fichier)

**Step 1: Créer et basculer sur la branche feature**

```bash
git checkout -b feat/brand-filter-search
```

Expected: `Switched to a new branch 'feat/brand-filter-search'`

---

### Task 2: Créer le composant `BrandFilter`

**Files:**
- Create: `app/(storefront)/search/brand-filter.tsx`

**Step 1: Créer le fichier avec le composant complet**

Créer `app/(storefront)/search/brand-filter.tsx` :

```tsx
"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

const INITIAL_VISIBLE = 5;

interface BrandFilterProps {
  brands: string[];
  activeBrands: string[];
  onToggle: (brand: string) => void;
}

export function BrandFilter({ brands, activeBrands, onToggle }: BrandFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  if (brands.length === 0) return null;

  const top5 = brands.slice(0, INITIAL_VISIBLE);
  const activeOutsideTop5 = activeBrands.filter((b) => !top5.includes(b));

  const collapsedBrands = [...top5, ...activeOutsideTop5];
  const hiddenCount = brands.length - collapsedBrands.length;

  const filteredBrands = expanded
    ? brands.filter((b) => b.toLowerCase().includes(search.toLowerCase()))
    : collapsedBrands;

  const handleExpand = () => {
    setExpanded(true);
    // Focus l'input après le rendu
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const handleCollapse = () => {
    setExpanded(false);
    setSearch("");
  };

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Marque
      </legend>

      {/* Input de recherche (visible uniquement déplié) */}
      {expanded && (
        <div className="relative mb-2">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher une marque"
            className="h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
      )}

      {/* Liste des marques */}
      <div className="space-y-1">
        {filteredBrands.length > 0 ? (
          filteredBrands.map((brand) => (
            <label
              key={brand}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={activeBrands.includes(brand)}
                onChange={() => onToggle(brand)}
                className="size-3.5 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              />
              {brand}
            </label>
          ))
        ) : (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Aucune marque trouvée</p>
        )}
      </div>

      {/* Bouton expand / collapse */}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={handleExpand}
          className="mt-1.5 px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          + {hiddenCount} marque{hiddenCount > 1 ? "s" : ""}
        </button>
      )}
      {expanded && (
        <button
          onClick={handleCollapse}
          className="mt-1.5 px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          Voir moins
        </button>
      )}
    </fieldset>
  );
}
```

**Step 2: Vérifier que le fichier existe**

```bash
ls app/(storefront)/search/brand-filter.tsx
```

Expected: le fichier est listé.

---

### Task 3: Intégrer `BrandFilter` dans `SearchFilters`

**Files:**
- Modify: `app/(storefront)/search/search-filters.tsx`

**Step 1: Ajouter l'import de `BrandFilter`**

Dans `app/(storefront)/search/search-filters.tsx`, ajouter l'import après les imports existants :

```ts
import { BrandFilter } from "./brand-filter";
```

**Step 2: Remplacer le bloc `fieldset` marques**

Repérer ce bloc (lignes ~83–105) :

```tsx
      {/* Brands */}
      {brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Marque
          </legend>
          <div className="space-y-1">
            {brands.map((brand) => (
              <label
                key={brand}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={activeBrands.includes(brand)}
                  onChange={() => handleBrandToggle(brand)}
                  className="size-3.5 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                />
                {brand}
              </label>
            ))}
          </div>
        </fieldset>
      )}
```

Le remplacer par :

```tsx
      {/* Brands */}
      <BrandFilter
        brands={brands}
        activeBrands={activeBrands}
        onToggle={handleBrandToggle}
      />
```

---

### Task 4: Vérifier types, lint, et tests

**Step 1: Vérifier les types TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

**Step 2: Vérifier le lint**

```bash
npm run lint
```

Expected: aucune erreur.

**Step 3: Lancer les tests**

```bash
npm run test
```

Expected: tous les tests passent (les tests existants ne couvrent pas les composants React, résultat inchangé).

---

### Task 5: Commit et PR

**Step 1: Stager les fichiers**

```bash
git add "app/(storefront)/search/brand-filter.tsx" "app/(storefront)/search/search-filters.tsx"
```

**Step 2: Commit**

```bash
git commit -m "feat(filters): truncate brand list with expand and inline search"
```

**Step 3: Pousser la branche**

```bash
git push -u origin feat/brand-filter-search
```

**Step 4: Créer la PR**

```bash
gh pr create \
  --title "feat(filters): truncate brand list with expand and inline search" \
  --body "$(cat <<'EOF'
## Summary
- Affiche les 5 premières marques par défaut dans la sidebar filtre
- Les marques actives hors du top 5 restent toujours visibles
- Bouton "+ N marques" pour révéler la liste complète avec un input de recherche inline auto-focusé
- Bouton "Voir moins" pour replier et réinitialiser la recherche

## Test plan
- [ ] Vérifier sur une catégorie avec > 5 marques : seules 5 s'affichent + bouton "+ N marques"
- [ ] Cliquer sur "+ N marques" : liste complète + input de recherche focusé
- [ ] Taper dans la recherche : la liste filtre en temps réel
- [ ] Sélectionner une marque hors top 5, replier : la marque reste visible
- [ ] Vérifier sur mobile (bottom sheet) : comportement identique
- [ ] Vérifier sur une catégorie avec ≤ 5 marques : aucun bouton expand affiché

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
