import { query, queryFirst } from "@/lib/db";
import type { Category } from "@/lib/db/types";

export async function getCategories(): Promise<Category[]> {
  return query<Category>(
    "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC"
  );
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return queryFirst<Category>(
    "SELECT * FROM categories WHERE slug = ? AND is_active = 1",
    [slug]
  );
}
