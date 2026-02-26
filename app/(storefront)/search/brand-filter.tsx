"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

const INITIAL_VISIBLE = 5;

const toggleBtnClass =
  "mt-1.5 px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

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

  const initialBrands = brands.slice(0, INITIAL_VISIBLE);
  const initialBrandSet = new Set(initialBrands);
  // Always show active brands that fall outside the first INITIAL_VISIBLE, so
  // users can see and deselect their selections even while the list is collapsed.
  const collapsedBrands = [
    ...initialBrands,
    ...activeBrands.filter((b) => !initialBrandSet.has(b)),
  ];
  const hiddenCount = brands.length - collapsedBrands.length;

  const activeBrandSet = new Set(activeBrands);
  const searchLower = search.toLowerCase();
  const filteredBrands = expanded
    ? brands.filter((b) => b.toLowerCase().includes(searchLower))
    : collapsedBrands;

  function handleExpand(): void {
    setExpanded(true);
    // Defer focus until React flushes the search input into the DOM.
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  function handleCollapse(): void {
    setExpanded(false);
    setSearch("");
  }

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Marque
      </legend>

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

      <div className="space-y-1">
        {filteredBrands.length > 0 ? (
          filteredBrands.map((brand) => (
            <label
              key={brand}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={activeBrandSet.has(brand)}
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

      {!expanded && hiddenCount > 0 && (
        <button type="button" onClick={handleExpand} className={toggleBtnClass}>
          + {hiddenCount} marque{hiddenCount > 1 ? "s" : ""}
        </button>
      )}
      {expanded && (
        <button type="button" onClick={handleCollapse} className={toggleBtnClass}>
          Voir moins
        </button>
      )}
    </fieldset>
  );
}
