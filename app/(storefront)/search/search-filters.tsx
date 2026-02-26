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

  const isCategoryPage = basePath.startsWith("/c/");

  return (
    <div className="space-y-6">
      {/* Category/subcategory sidebar */}
      <CategorySidebar
        categoryTree={categoryTree}
        activeCategorySlug={activeCategorySlug}
        label={isCategoryPage ? "Sous-catégories" : "Catégories"}
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
