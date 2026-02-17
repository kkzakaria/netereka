"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/utils/format";
import type { CategoryNode } from "@/lib/db/types";
import { useFilterData } from "./filter-context";

function findInTree(nodes: readonly CategoryNode[], slug: string): CategoryNode | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findInTree(node.children, slug);
    if (found) return found;
  }
  return undefined;
}

export function ActiveFilters() {
  const { categoryTree, basePath } = useFilterData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category");
  const activeBrands = searchParams.get("brand")?.split(",").filter(Boolean) ?? [];
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");

  const hasFilters = activeCategory || activeBrands.length > 0 || minPrice || maxPrice;
  if (!hasFilters) return null;

  const removeParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "brand" && value) {
      const remaining = activeBrands.filter((b) => b !== value);
      if (remaining.length > 0) {
        params.set("brand", remaining.join(","));
      } else {
        params.delete("brand");
      }
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const sort = searchParams.get("sort");
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    router.push(`${basePath}?${params.toString()}`);
  };

  const categoryName = activeCategory
    ? findInTree(categoryTree, activeCategory)?.name
    : null;

  return (
    <>
      {categoryName && (
        <FilterChip label={categoryName} onRemove={() => removeParam("category")} />
      )}
      {activeBrands.map((brand) => (
        <FilterChip key={brand} label={brand} onRemove={() => removeParam("brand", brand)} />
      ))}
      {minPrice && (
        <FilterChip
          label={`Min: ${formatPrice(parseInt(minPrice, 10))}`}
          onRemove={() => removeParam("min_price")}
        />
      )}
      {maxPrice && (
        <FilterChip
          label={`Max: ${formatPrice(parseInt(maxPrice, 10))}`}
          onRemove={() => removeParam("max_price")}
        />
      )}
      <button
        onClick={clearAll}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        Tout effacer
      </button>
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      aria-label={`Retirer ${label}`}
      className="inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[0.625rem] font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      {label}
      <span aria-hidden="true" className="ml-0.5 text-muted-foreground">&times;</span>
    </button>
  );
}
