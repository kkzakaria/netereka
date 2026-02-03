"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useInstantFilters } from "@/hooks/use-instant-filters";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
  className?: string;
}

export function ProductFilters({ categories, className }: ProductFiltersProps) {
  const {
    isPending,
    updateFilters,
    clearFilters,
    getFilter,
    searchValue,
    handleSearchChange,
    clearSearch,
  } = useInstantFilters({ basePath: "/products" });

  const hasActiveFilters =
    searchValue || getFilter("category") || getFilter("status");

  return (
    <div
      className={className}
      data-pending={isPending || undefined}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input with clear button */}
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Rechercher..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 sm:w-64"
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
          )}
        </div>

        {/* Category filter - instant */}
        <Select
          value={getFilter("category") || "all"}
          onValueChange={(value) => updateFilters({ category: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter - instant */}
        <Select
          value={getFilter("status") || "all"}
          onValueChange={(value) => updateFilters({ status: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear all filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1.5 text-muted-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
            Tout effacer
          </Button>
        )}
      </div>
    </div>
  );
}
