import { query, queryFirst } from "@/lib/db";
import type { Category, CategoryNode, SidebarCategoryNode } from "@/lib/db/types";
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
    `WITH RECURSIVE descendants(id, depth) AS (
      SELECT id, 1 FROM categories WHERE parent_id = ? AND is_active = 1
      UNION ALL
      SELECT c.id, d.depth + 1 FROM categories c
      JOIN descendants d ON c.parent_id = d.id
      WHERE c.is_active = 1 AND d.depth < 10
    )
    SELECT id FROM descendants`,
    [categoryId]
  );
  return rows.map((r) => r.id);
}

export async function getCategoryAncestors(categoryId: string): Promise<Category[]> {
  return query<Category & { depth: number }>(
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
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await getCategories();

  // Use mutable children arrays during construction, returned as readonly via CategoryNode
  const nodeMap = new Map<string, CategoryNode & { children: CategoryNode[] }>();
  for (const cat of all) {
    nodeMap.set(cat.id, { ...cat, children: [] });
  }

  const roots: CategoryNode[] = [];
  let orphanCount = 0;
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    } else {
      orphanCount++;
      console.warn(
        `[db/categories] getCategoryTree: category "${node.name}" (${node.id}) has parent_id="${node.parent_id}" but parent is inactive or missing. Excluding from tree.`
      );
    }
  }

  // Detect cycles: nodes whose parent exists in the map but never became roots or children of roots
  const treeNodeCount = countTreeNodes(roots);
  const cyclicCount = all.length - treeNodeCount - orphanCount;
  if (cyclicCount > 0) {
    console.error(
      `[db/categories] getCategoryTree: ${cyclicCount} category(ies) excluded due to circular parent references.`
    );
  }

  return roots;
}

function countTreeNodes(nodes: readonly CategoryNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countTreeNodes(node.children);
  }
  return count;
}

/** Strip a category tree to only the fields needed by client-side sidebar. */
export function minifyCategoryTree(nodes: readonly CategoryNode[]): SidebarCategoryNode[] {
  return nodes.map((n) => ({
    id: n.id,
    slug: n.slug,
    name: n.name,
    children: minifyCategoryTree(n.children),
  }));
}
