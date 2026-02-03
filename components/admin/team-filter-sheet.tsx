"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, FilterIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface TeamFilterSheetProps {
  className?: string;
}

interface FilterState {
  search: string;
  role: string;
  status: string;
}

const ROLE_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "delivery", label: "Livreur" },
  { value: "support", label: "Service Client" },
  { value: "accountant", label: "Comptable" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
];

function getFiltersFromParams(params: URLSearchParams): FilterState {
  return {
    search: params.get("search") ?? "",
    role: params.get("role") ?? "all",
    status: params.get("status") ?? "all",
  };
}

export function TeamFilterSheet({ className }: TeamFilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const filtersFromUrl = useMemo(
    () => getFiltersFromParams(searchParams),
    [searchParams]
  );

  const [filters, setFilters] = useState<FilterState>(filtersFromUrl);

  const urlKey = searchParams.toString();
  useEffect(() => {
    setFilters(getFiltersFromParams(searchParams));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.role !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleApply() {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.role && filters.role !== "all") params.set("role", filters.role);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    router.push(`/team?${params.toString()}`);
    setOpen(false);
  }

  function handleClear() {
    setFilters({
      search: "",
      role: "all",
      status: "all",
    });
  }

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
          className
        )}
      >
        <HugeiconsIcon icon={FilterIcon} size={18} aria-hidden="true" />
        Filtres
        {activeFilterCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal={open}
        aria-label="Filtres de l'équipe"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-xl transition-transform duration-300 ease-out pb-safe",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Filtres</h2>
          <button
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="Fermer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 touch-manipulation">
          {/* Search */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">Recherche</label>
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Nom, email..."
                className="h-12 w-full rounded-lg border bg-background pl-10 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Role */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">Rôle</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter("role", opt.value)}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                    filters.role === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">Statut</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter("status", opt.value)}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                    filters.status === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t p-4">
          <button
            onClick={handleClear}
            className="h-12 flex-1 rounded-xl border text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            Effacer
          </button>
          <button
            onClick={handleApply}
            className="h-12 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            Appliquer
          </button>
        </div>
      </div>
    </>
  );
}
