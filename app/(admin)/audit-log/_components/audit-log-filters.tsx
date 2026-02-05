"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui/label";
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
import { AUDIT_ACTION_OPTIONS } from "@/lib/constants/audit";

export function AuditLogFilters() {
  const {
    isPending,
    updateFilters,
    clearFilters,
    getFilter,
  } = useInstantFilters({ basePath: "/audit-log" });

  const hasActiveFilters =
    getFilter("action") ||
    getFilter("dateFrom") ||
    getFilter("dateTo");

  return (
    <div className="mb-4" data-pending={isPending || undefined}>
      <div className="flex flex-wrap items-end gap-3">
        {/* Action filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select
            value={getFilter("action") || "all"}
            onValueChange={(value) => updateFilters({ action: value })}
          >
            <SelectTrigger className="min-w-48">
              <SelectValue placeholder="Toutes les actions" />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auditDateFrom" className="text-xs text-muted-foreground">
            Depuis
          </Label>
          <Input
            id="auditDateFrom"
            type="date"
            value={getFilter("dateFrom")}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="min-w-36"
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auditDateTo" className="text-xs text-muted-foreground">
            Jusqu&apos;au
          </Label>
          <Input
            id="auditDateTo"
            type="date"
            value={getFilter("dateTo")}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="min-w-36"
          />
        </div>

        {/* Clear */}
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
