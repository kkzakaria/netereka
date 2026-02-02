"use client";

import { createContext, useContext } from "react";
import type { Category, PriceRange } from "@/lib/db/types";

interface FilterData {
  categories: Category[];
  brands: string[];
  priceRange: PriceRange;
}

const FilterContext = createContext<FilterData | null>(null);

export function FilterProvider({
  children,
  ...data
}: FilterData & { children: React.ReactNode }) {
  return (
    <FilterContext value={data}>
      {children}
    </FilterContext>
  );
}

export function useFilterData() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilterData must be used within FilterProvider");
  return ctx;
}
