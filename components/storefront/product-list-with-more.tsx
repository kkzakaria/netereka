"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import type { ProductCardData, SearchOptions } from "@/lib/db/types";
import { ProductGrid } from "@/components/storefront/product-grid";
import { loadMoreSearchProducts } from "@/actions/search";
import { listingPageHref, type ListingParams } from "@/lib/seo/pagination";

interface Props {
  initialProducts: ProductCardData[];
  initialHasMore: boolean;
  searchOpts: Omit<SearchOptions, "offset" | "limit">;
  limit: number;
  initialNextOffset: number;
  /**
   * Quand il est fourni, « Charger plus » est un vrai lien vers la page
   * suivante (crawlable, et utilisable sans JavaScript) ; le clic reste
   * intercepté pour charger la suite sur place.
   */
  pagination?: { basePath: string; params: ListingParams };
}

const buttonClass =
  "rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

export function ProductListWithMore({
  initialProducts,
  initialHasMore,
  searchOpts,
  limit,
  initialNextOffset,
  pagination,
}: Props) {
  const [products, setProducts] = useState<ProductCardData[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const nextOffsetRef = useRef(initialNextOffset);
  // Mirrors nextOffsetRef for rendering: the link must point at the page that
  // the next click would load, not at the one the server rendered.
  const [nextOffset, setNextOffset] = useState(initialNextOffset);

  const loadMore = useCallback(() => {
    const offset = nextOffsetRef.current;
    startTransition(async () => {
      const { products: newProducts, hasMore: newHasMore } = await loadMoreSearchProducts({
        ...searchOpts,
        limit,
        offset,
      });
      setProducts(curr => [...curr, ...newProducts]);
      setHasMore(newHasMore);
      nextOffsetRef.current = offset + limit;
      setNextOffset(offset + limit);
    });
  }, [searchOpts, limit]);

  return (
    <>
      <ProductGrid products={products} />
      {hasMore && (
        <div className="mt-8 flex justify-center">
          {pagination ? (
            <a
              href={listingPageHref(
                pagination.basePath,
                pagination.params,
                Math.floor(nextOffset / limit) + 1,
              )}
              onClick={(e) => {
                // Ctrl/Cmd-clic, clic milieu : laisser le navigateur ouvrir la page.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                if (!isPending) loadMore();
              }}
              aria-disabled={isPending || undefined}
              className={`${buttonClass} inline-flex min-h-11 items-center${isPending ? " pointer-events-none opacity-50" : ""}`}
            >
              {isPending ? "Chargement…" : "Charger plus"}
            </a>
          ) : (
            <button onClick={loadMore} disabled={isPending} className={buttonClass}>
              {isPending ? "Chargement…" : "Charger plus"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
