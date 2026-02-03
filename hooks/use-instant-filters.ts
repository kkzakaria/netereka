"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface UseInstantFiltersOptions {
  basePath: string;
  debounceMs?: number;
}

/**
 * Hook for instant URL-based filtering with debounce support.
 * Provides a unified way to update search params without form submission.
 */
export function useInstantFilters({ basePath, debounceMs = 300 }: UseInstantFiltersOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Update URL params instantly (for selects, checkboxes)
   */
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset to page 1 on filter change
      params.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`);
      });
    },
    [router, searchParams, basePath]
  );

  /**
   * Update URL params with debounce (for text inputs)
   */
  const updateFiltersDebounced = useCallback(
    (updates: Record<string, string | null>) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateFilters(updates);
      }, debounceMs);
    },
    [updateFilters, debounceMs]
  );

  /**
   * Clear all filters and reset to base path
   */
  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(basePath);
    });
  }, [router, basePath]);

  /**
   * Get current value of a filter param
   */
  const getFilter = useCallback(
    (key: string, defaultValue = "") => {
      return searchParams.get(key) ?? defaultValue;
    },
    [searchParams]
  );

  return {
    isPending,
    updateFilters,
    updateFiltersDebounced,
    clearFilters,
    getFilter,
    searchParams,
  };
}
