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
import { ORDER_STATUS_LABELS } from "@/lib/constants/orders";

interface OrderFiltersProps {
  communes: string[];
  className?: string;
}

// All statuses plus "all" option
const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export function OrderFilters({ communes, className }: OrderFiltersProps) {
  const {
    isPending,
    updateFilters,
    updateFiltersDebounced,
    clearFilters,
    getFilter,
  } = useInstantFilters({ basePath: "/orders" });

  const hasActiveFilters =
    getFilter("search") ||
    getFilter("status") ||
    getFilter("commune") ||
    getFilter("dateFrom") ||
    getFilter("dateTo");

  return (
    <div
      className={className}
      data-pending={isPending || undefined}
    >
      <div className="flex flex-wrap items-end gap-3">
        {/* Search input with debounce */}
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
              placeholder="N° commande, nom, tél..."
              defaultValue={getFilter("search")}
              onChange={(e) => updateFiltersDebounced({ search: e.target.value })}
              className="w-full pl-9 sm:w-48"
            />
          </div>
        </div>

        {/* Status filter - instant */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Statut</Label>
          <Select
            value={getFilter("status") || "all"}
            onValueChange={(value) => updateFilters({ status: value })}
          >
            <SelectTrigger className="min-w-36">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commune filter - instant */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Commune</Label>
          <Select
            value={getFilter("commune") || "all"}
            onValueChange={(value) => updateFilters({ commune: value })}
          >
            <SelectTrigger className="min-w-40">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {communes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from - instant */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
            Date début
          </Label>
          <Input
            id="dateFrom"
            type="date"
            defaultValue={getFilter("dateFrom")}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="min-w-36"
          />
        </div>

        {/* Date to - instant */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
            Date fin
          </Label>
          <Input
            id="dateTo"
            type="date"
            defaultValue={getFilter("dateTo")}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="min-w-36"
          />
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1.5 text-muted-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
