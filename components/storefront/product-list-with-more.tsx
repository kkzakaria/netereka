"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import type { ProductCardData, SearchOptions } from "@/lib/db/types";
import { ProductGrid } from "@/components/storefront/product-grid";
import { loadMoreSearchProducts } from "@/actions/search";

interface Props {
  initialProducts: ProductCardData[];
  initialHasMore: boolean;
  searchOpts: Omit<SearchOptions, "offset" | "limit">;
  limit: number;
  initialNextOffset: number;
}

export function ProductListWithMore({
  initialProducts,
  initialHasMore,
  searchOpts,
  limit,
  initialNextOffset,
}: Props) {
  const [products, setProducts] = useState<ProductCardData[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const nextOffsetRef = useRef(initialNextOffset);

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
    });
  }, [searchOpts, limit]);

  return (
    <>
      <ProductGrid products={products} />
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Chargement…" : "Charger plus"}
          </button>
        </div>
      )}
    </>
  );
}
