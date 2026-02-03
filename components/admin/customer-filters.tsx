"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useInstantFilters } from "@/hooks/use-instant-filters";

interface CustomerFiltersProps {
  className?: string;
}

const ROLE_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "customer", label: "Client" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export function CustomerFilters({ className }: CustomerFiltersProps) {
  const {
    isPending,
    updateFilters,
    clearFilters,
    getFilter,
    searchValue,
    handleSearchChange,
    clearSearch,
  } = useInstantFilters({ basePath: "/customers" });

  const hasActiveFilters =
    searchValue ||
    getFilter("role") ||
    getFilter("dateFrom") ||
    getFilter("dateTo");

  return (
    <div className={className} data-pending={isPending || undefined}>
      <div className="flex flex-wrap items-end gap-3">
        {/* Search input with clear button */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search" className="text-xs text-muted-foreground">
            Recherche
          </Label>
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="search"
              placeholder="Nom, email, tél..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 sm:w-48"
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
        </div>

        {/* Role filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Rôle</Label>
          <Select
            value={getFilter("role") || "all"}
            onValueChange={(value) => updateFilters({ role: value })}
          >
            <SelectTrigger className="min-w-36">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
            Inscrit depuis
          </Label>
          <Input
            id="dateFrom"
            type="date"
            value={getFilter("dateFrom")}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="min-w-36"
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
            Jusqu&apos;au
          </Label>
          <Input
            id="dateTo"
            type="date"
            value={getFilter("dateTo")}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="min-w-36"
          />
        </div>

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
