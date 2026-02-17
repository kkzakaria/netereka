import { query, queryFirst } from "@/lib/db";
import type { Category } from "@/lib/db/types";

export interface CategoryWithCount extends Category {
  product_count: number;
  parent_name: string | null;
  depth: number;
}

export async function getAllCategories(): Promise<CategoryWithCount[]> {
  return query<CategoryWithCount>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count,
       parent.name as parent_name,
       CASE
         WHEN c.parent_id IS NULL THEN 0
         WHEN (SELECT parent_id FROM categories WHERE id = c.parent_id) IS NULL THEN 1
         ELSE 2
       END as depth
     FROM categories c
     LEFT JOIN categories parent ON parent.id = c.parent_id
     ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.sort_order ASC`
  );
}

export async function getCategoryById(
  id: string
): Promise<Category | null> {
  return queryFirst<Category>("SELECT * FROM categories WHERE id = ?", [id]);
}
