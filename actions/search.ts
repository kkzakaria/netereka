"use server";

import { query } from "@/lib/db";
import { searchProducts, countSearchResults } from "@/lib/db/search";
import type { ProductCardData, SearchOptions, SearchSuggestion } from "@/lib/db/types";

export async function loadMoreSearchProducts(
  opts: SearchOptions
): Promise<{ products: ProductCardData[]; hasMore: boolean }> {
  const [products, total] = await Promise.all([
    searchProducts(opts),
    countSearchResults(opts),
  ]);
  const hasMore = (opts.offset ?? 0) + products.length < total;
  return { products, hasMore };
}

export async function getSearchSuggestions(
  term: string
): Promise<SearchSuggestion[]> {
  if (!term || term.length < 2) return [];

  const like = `%${term}%`;
  return query<SearchSuggestion>(
    `SELECT p.slug, p.name, p.brand, p.base_price,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url
     FROM products p
     WHERE p.is_active = 1 AND (p.name LIKE ? OR p.brand LIKE ?)
     ORDER BY p.is_featured DESC, p.created_at DESC
     LIMIT 5`,
    [like, like]
  );
}
