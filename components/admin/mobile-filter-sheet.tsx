"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel, FilterIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface AdminMobileFilterSheetProps {
  categories: Category[];
  basePath: string;
}

const statusOptions = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
] as const;

export function AdminMobileFilterSheet({
  categories,
  basePath,
}: AdminMobileFilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Local state for form
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");

  // Count active filters (excluding search and "all" status)
  const activeFilterCount =
    (category ? 1 : 0) + (status !== "all" ? 1 : 0) + (search ? 1 : 0);

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
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (status && status !== "all") params.set("status", status);
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  }

  function handleClear() {
    setSearch("");
    setCategory("");
    setStatus("all");
  }

  return (
    <>
      {/* Trigger button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none lg:hidden"
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
        aria-label="Filtres"
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
            <HugeiconsIcon icon={Cancel} size={20} aria-hidden="true" />
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, SKU..."
                className="h-12 w-full rounded-lg border bg-background pl-10 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Catégorie</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategory("")}
                  className={cn(
                    "h-10 rounded-lg border px-4 text-sm font-medium transition-colors",
                    !category
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  Toutes
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "h-10 rounded-lg border px-4 text-sm font-medium transition-colors",
                      category === cat.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">Statut</label>
            <div className="flex gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "h-10 flex-1 rounded-lg border text-sm font-medium transition-colors",
                    status === opt.value
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
