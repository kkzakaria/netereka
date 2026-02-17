import { query, queryFirst } from "@/lib/db";
import type { Category } from "@/lib/db/types";

export interface CategoryWithCount extends Category {
  product_count: number;
  parent_name: string | null;
  depth: number;
}

export async function getAllCategories(): Promise<CategoryWithCount[]> {
  return query<CategoryWithCount>(
    `WITH RECURSIVE tree(id, depth, path) AS (
       SELECT id, 0, printf('%04d', sort_order)
       FROM categories WHERE parent_id IS NULL
       UNION ALL
       SELECT c.id, t.depth + 1, t.path || '/' || printf('%04d', c.sort_order)
       FROM categories c
       JOIN tree t ON c.parent_id = t.id
       WHERE t.depth < 3
     )
     SELECT c.*,
       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count,
       parent.name as parent_name,
       t.depth
     FROM tree t
     JOIN categories c ON c.id = t.id
     LEFT JOIN categories parent ON parent.id = c.parent_id
     ORDER BY t.path ASC`
  );
}

export async function getCategoryById(
  id: string
): Promise<Category | null> {
  return queryFirst<Category>("SELECT * FROM categories WHERE id = ?", [id]);
}
