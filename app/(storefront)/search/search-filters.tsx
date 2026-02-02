"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils/format";
import { useFilterData } from "./filter-context";

export function SearchFilters() {
  const { categories, brands, priceRange, basePath, hideCategory } = useFilterData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") ?? "";
  const activeBrands = searchParams.get("brand")?.split(",").filter(Boolean) ?? [];
  const activeMinPrice = searchParams.get("min_price") ?? "";
  const activeMaxPrice = searchParams.get("max_price") ?? "";

  const [priceState, setPriceState] = useState({ min: activeMinPrice, max: activeMaxPrice, urlMin: activeMinPrice, urlMax: activeMaxPrice });
  const priceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync local price state when URL changes externally (e.g. "Tout effacer")
  let { min: minPrice, max: maxPrice } = priceState;
  if (priceState.urlMin !== activeMinPrice || priceState.urlMax !== activeMaxPrice) {
    minPrice = activeMinPrice;
    maxPrice = activeMaxPrice;
    setPriceState({ min: activeMinPrice, max: activeMaxPrice, urlMin: activeMinPrice, urlMax: activeMaxPrice });
  }

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

  const handleCategoryChange = (slug: string) => {
    updateParams({ category: slug === activeCategory ? null : slug });
  };

  const handleBrandToggle = (brand: string) => {
    const next = activeBrands.includes(brand)
      ? activeBrands.filter((b) => b !== brand)
      : [...activeBrands, brand];
    updateParams({ brand: next.length > 0 ? next.join(",") : null });
  };

  const handlePriceChange = (field: "min_price" | "max_price", value: string) => {
    setPriceState((prev) => ({
      ...prev,
      [field === "min_price" ? "min" : "max"]: value,
    }));

    clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      updateParams({ [field]: value || null });
    }, 500);
  };

  const handleReset = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`${basePath}?${params.toString()}`);
  };

  const hasFilters = activeCategory || activeBrands.length > 0 || activeMinPrice || activeMaxPrice;

  return (
    <div className="space-y-6">
      {/* Categories */}
      {!hideCategory && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Catégorie
          </legend>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none ${
                  cat.slug === activeCategory
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

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
                  className="size-3.5 rounded border-input accent-primary"
                />
                {brand}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Price range */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prix
        </legend>
        <p className="mb-2 text-[10px] text-muted-foreground">
          {formatPrice(priceRange.min)} — {formatPrice(priceRange.max)}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min…"
            aria-label="Prix minimum"
            value={minPrice}
            onChange={(e) => handlePriceChange("min_price", e.target.value)}
            className="h-8 text-xs"
          />
          <span className="text-muted-foreground" aria-hidden="true">—</span>
          <Input
            type="number"
            placeholder="Max…"
            aria-label="Prix maximum"
            value={maxPrice}
            onChange={(e) => handlePriceChange("max_price", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </fieldset>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={handleReset}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
