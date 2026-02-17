import { query, queryFirst } from "@/lib/db";
import type { Category, CategoryNode } from "@/lib/db/types";

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
  const ancestors: Category[] = [];
  let currentId: string | null = categoryId;

  // Walk up the parent chain (max 2 levels, so at most 2 iterations)
  while (currentId) {
    const cat: Category | null = await queryFirst<Category>(
      "SELECT * FROM categories WHERE id = ?",
      [currentId]
    );
    if (!cat || !cat.parent_id) break;
    const parent: Category | null = await queryFirst<Category>(
      "SELECT * FROM categories WHERE id = ?",
      [cat.parent_id]
    );
    if (!parent) break;
    ancestors.unshift(parent);
    currentId = parent.parent_id;
  }

  return ancestors;
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await getCategories();

  // Build a map of all nodes
  const nodeMap = new Map<string, CategoryNode>();
  for (const cat of all) {
    nodeMap.set(cat.id, { ...cat, children: [] });
  }

  // Build tree structure
  const roots: CategoryNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
