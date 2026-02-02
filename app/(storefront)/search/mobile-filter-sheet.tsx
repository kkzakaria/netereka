"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel, FilterIcon } from "@hugeicons/core-free-icons";
import { SearchFilters } from "./search-filters";

export function MobileFilterSheet() {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      {/* Trigger — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none lg:hidden"
      >
        <HugeiconsIcon icon={FilterIcon} size={14} aria-hidden="true" />
        Filtres
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sheet — slides up from bottom */}
      <div
        role="dialog"
        aria-modal={open}
        aria-label="Filtres"
        className={`fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Filtres</h2>
          <button
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="Fermer"
          >
            <HugeiconsIcon icon={Cancel} size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 touch-manipulation">
          <SearchFilters />
        </div>
        <div className="border-t p-4">
          <button
            onClick={() => setOpen(false)}
            className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            Appliquer
          </button>
        </div>
      </div>
    </>
  );
}
