"use server";

import { query } from "@/lib/db";
import type { SearchSuggestion } from "@/lib/db/types";

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
