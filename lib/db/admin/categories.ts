import { query, queryFirst } from "@/lib/db";
import type { Category } from "@/lib/db/types";

export interface CategoryWithCount extends Category {
  product_count: number;
}

export async function getAllCategories(): Promise<CategoryWithCount[]> {
  return query<CategoryWithCount>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count
     FROM categories c
     ORDER BY c.sort_order ASC`
  );
}

export async function getCategoryById(
  id: string
): Promise<Category | null> {
  return queryFirst<Category>("SELECT * FROM categories WHERE id = ?", [id]);
}
