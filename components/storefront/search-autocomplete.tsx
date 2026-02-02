"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search, Cancel } from "@hugeicons/core-free-icons";
import { getSearchSuggestions } from "@/actions/search";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import type { SearchSuggestion } from "@/lib/db/types";

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const results = await getSearchSuggestions(term);
    setSuggestions(results);
    setOpen(results.length > 0);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    setExpanded(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelect = (slug: string) => {
    setOpen(false);
    setExpanded(false);
    setQuery("");
    router.push(`/p/${slug}`);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onClick, { passive: true });
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop: inline search */}
      <form onSubmit={handleSubmit} className="hidden md:block">
        <div className="relative">
          <HugeiconsIcon
            icon={Search}
            size={16}
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder="Rechercher…"
            aria-label="Rechercher"
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-56 rounded-lg border bg-muted/50 pl-8 pr-3 text-sm transition-all placeholder:text-muted-foreground focus-visible:w-72 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
        </div>
      </form>

      {/* Mobile: icon → full-width overlay */}
      <div className="md:hidden">
        <button
          onClick={() => { setExpanded(true); }}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none ${expanded ? "invisible" : ""}`}
          aria-label="Rechercher"
        >
          <HugeiconsIcon icon={Search} size={20} aria-hidden="true" />
        </button>
      </div>
      {expanded && (
        <form
          onSubmit={handleSubmit}
          className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-2 border-b bg-background px-4 md:hidden"
        >
          <input
            autoFocus
            type="search"
            name="q"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher"
            autoComplete="off"
            spellCheck={false}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={() => { setExpanded(false); setOpen(false); setQuery(""); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="Fermer"
          >
            <HugeiconsIcon icon={Cancel} size={18} aria-hidden="true" />
          </button>
        </form>
      )}

      {/* Suggestions dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Suggestions"
          aria-live="polite"
          className="fixed inset-x-0 top-16 z-50 overflow-hidden border-b bg-background shadow-lg md:absolute md:inset-x-auto md:left-0 md:right-0 md:top-full md:mt-1 md:w-72 md:rounded-lg md:border md:shadow-lg"
        >
          {suggestions.map((s) => (
            <button
              key={s.slug}
              role="option"
              aria-selected={false}
              onClick={() => handleSelect(s.slug)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={getImageUrl(s.image_url)}
                  alt={s.name}
                  fill
                  className="object-contain p-1"
                  sizes="40px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{s.name}</p>
                <p className="text-xs font-medium text-foreground">
                  {formatPrice(s.base_price)}
                </p>
              </div>
            </button>
          ))}
          <button
            onClick={() => handleSubmit()}
            className="w-full border-t px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            Voir tous les résultats pour &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
