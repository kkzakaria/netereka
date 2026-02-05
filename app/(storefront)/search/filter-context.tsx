"use client";

import { createContext, useContext } from "react";
import type { CategoryFilterItem, PriceRange } from "@/lib/db/types";

interface FilterData {
  categories: CategoryFilterItem[];
  brands: string[];
  priceRange: PriceRange;
  basePath: string;
  hideCategory?: boolean;
}

const FilterContext = createContext<FilterData | null>(null);

export function FilterProvider({
  children,
  basePath = "/search",
  ...data
}: Omit<FilterData, "basePath"> & { basePath?: string; children: React.ReactNode }) {
  return (
    <FilterContext value={{ ...data, basePath }}>
      {children}
    </FilterContext>
  );
}

export function useFilterData() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilterData must be used within FilterProvider");
  return ctx;
}
