import { query, queryFirst } from "@/lib/db";
import type { Category, CategoryNode } from "@/lib/db/types";
import { MAX_CATEGORY_DEPTH } from "@/lib/db/types";

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

export async function getTopLevelCategories(): Promise<Category[]> {
  return query<Category>(
    "SELECT * FROM categories WHERE is_active = 1 AND parent_id IS NULL ORDER BY sort_order ASC"
  );
}

export async function getCategoryChildren(parentId: string): Promise<Category[]> {
  return query<Category>(
    "SELECT * FROM categories WHERE is_active = 1 AND parent_id = ? ORDER BY sort_order ASC",
    [parentId]
  );
}

export async function getCategoryDescendantIds(categoryId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `WITH RECURSIVE descendants AS (
      SELECT id FROM categories WHERE parent_id = ? AND is_active = 1
      UNION ALL
      SELECT c.id FROM categories c
      JOIN descendants d ON c.parent_id = d.id
      WHERE c.is_active = 1
    )
    SELECT id FROM descendants`,
    [categoryId]
  );
  return rows.map((r) => r.id);
}

export async function getCategoryAncestors(categoryId: string): Promise<Category[]> {
  // Single recursive CTE query instead of N+1 iterative queries
  const rows = await query<Category & { depth: number }>(
    `WITH RECURSIVE ancestors(id, depth) AS (
      SELECT parent_id, 1 FROM categories WHERE id = ?
      UNION ALL
      SELECT c.parent_id, a.depth + 1 FROM categories c
      JOIN ancestors a ON c.id = a.id
      WHERE c.parent_id IS NOT NULL AND a.depth <= ?
    )
    SELECT c.*, a.depth FROM ancestors a
    JOIN categories c ON c.id = a.id
    ORDER BY a.depth DESC`,
    [categoryId, MAX_CATEGORY_DEPTH]
  );
  return rows;
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await getCategories();

  // Build a map of all nodes
  const nodeMap = new Map<string, CategoryNode>();
  for (const cat of all) {
    nodeMap.set(cat.id, { ...cat, children: [] });
  }

  // Build tree structure — exclude orphans (active children whose parent is inactive/missing)
  const roots: CategoryNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      (nodeMap.get(node.parent_id)!.children as CategoryNode[]).push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    } else {
      console.warn(
        `[db/categories] getCategoryTree: category "${node.name}" (${node.id}) has parent_id="${node.parent_id}" but parent is inactive or missing. Excluding from tree.`
      );
    }
  }

  return roots;
}
