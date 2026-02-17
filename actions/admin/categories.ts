"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { MAX_CATEGORY_DEPTH } from "@/lib/db/types";
import { slugify, type ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

const categorySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  slug: z.string().min(1),
  description: z.string().optional().default(""),
  parent_id: z.string().optional().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.number().min(0).max(1).default(1),
});

/** Count how many ancestors a category has (root = 0). Single CTE query. */
async function getDepth(categoryId: string): Promise<number> {
  const result = await queryFirst<{ depth: number }>(
    `WITH RECURSIVE ancestors(id, depth) AS (
      SELECT parent_id, 1 FROM categories WHERE id = ?
      UNION ALL
      SELECT c.parent_id, a.depth + 1 FROM categories c
      JOIN ancestors a ON c.id = a.id
      WHERE c.parent_id IS NOT NULL AND a.depth <= ?
    )
    SELECT COALESCE(MAX(depth), 0) as depth FROM ancestors`,
    [categoryId, MAX_CATEGORY_DEPTH + 1]
  );
  return result?.depth ?? 0;
}

async function getMaxSubtreeDepth(categoryId: string): Promise<number> {
  const result = await queryFirst<{ max_depth: number }>(
    `WITH RECURSIVE subtree(id, depth) AS (
      SELECT id, 1 FROM categories WHERE parent_id = ?
      UNION ALL
      SELECT c.id, s.depth + 1 FROM categories c
      JOIN subtree s ON c.parent_id = s.id
      WHERE s.depth < 10
    )
    SELECT COALESCE(MAX(depth), 0) as max_depth FROM subtree`,
    [categoryId]
  );
  return result?.max_depth ?? 0;
}

async function isDescendantOf(categoryId: string, potentialAncestorId: string): Promise<boolean> {
  const result = await queryFirst<{ id: string }>(
    `WITH RECURSIVE descendants(id, depth) AS (
      SELECT id, 1 FROM categories WHERE parent_id = ?
      UNION ALL
      SELECT c.id, d.depth + 1 FROM categories c
      JOIN descendants d ON c.parent_id = d.id
      WHERE d.depth < 10
    )
    SELECT id FROM descendants WHERE id = ? LIMIT 1`,
    [potentialAncestorId, categoryId]
  );
  return !!result;
}

async function validateParent(parentId: string): Promise<ActionResult | null> {
  const [parent, parentDepth] = await Promise.all([
    queryFirst<{ id: string }>("SELECT id FROM categories WHERE id = ?", [parentId]),
    getDepth(parentId),
  ]);
  if (!parent) {
    return { success: false, error: "Catégorie parente introuvable" };
  }
  if (parentDepth >= MAX_CATEGORY_DEPTH) {
    return { success: false, error: "Profondeur maximale atteinte (2 niveaux)" };
  }
  return null;
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  if (!raw.slug || (raw.slug as string).trim() === "") {
    raw.slug = slugify(raw.name as string);
  }

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const parentId = data.parent_id || null;
  const id = nanoid();

  if (parentId) {
    const error = await validateParent(parentId);
    if (error) return error;
  }

  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM categories WHERE slug = ?",
    [data.slug]
  );
  if (existing) {
    return { success: false, error: "Une catégorie avec ce slug existe déjà" };
  }

  await execute(
    `INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, data.name, data.slug, data.description || null, parentId, data.sort_order, data.is_active]
  );

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { success: true, id };
}

export async function updateCategory(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID catégorie invalide" };

  const raw = Object.fromEntries(formData);
  if (!raw.slug || (raw.slug as string).trim() === "") {
    raw.slug = slugify(raw.name as string);
  }

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const parentId = data.parent_id || null;

  // Prevent self-reference
  if (parentId === id) {
    return { success: false, error: "Une catégorie ne peut pas être son propre parent" };
  }

  if (parentId) {
    // Prevent circular references: new parent must not be a descendant
    if (await isDescendantOf(parentId, id)) {
      return { success: false, error: "Référence circulaire : le parent est un descendant de cette catégorie" };
    }

    // Validate parent exists + check depths in parallel
    const [parent, parentDepth, subtreeDepth] = await Promise.all([
      queryFirst<{ id: string }>("SELECT id FROM categories WHERE id = ?", [parentId]),
      getDepth(parentId),
      getMaxSubtreeDepth(id),
    ]);

    if (!parent) {
      return { success: false, error: "Catégorie parente introuvable" };
    }
    if (parentDepth >= MAX_CATEGORY_DEPTH) {
      return { success: false, error: "Profondeur maximale atteinte (2 niveaux)" };
    }
    if (parentDepth + 1 + subtreeDepth > MAX_CATEGORY_DEPTH) {
      return { success: false, error: "Ce déplacement dépasserait la profondeur maximale (2 niveaux)" };
    }
  }

  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM categories WHERE slug = ? AND id != ?",
    [data.slug, id]
  );
  if (existing) {
    return { success: false, error: "Une catégorie avec ce slug existe déjà" };
  }

  await execute(
    `UPDATE categories SET name = ?, slug = ?, description = ?, parent_id = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [data.name, data.slug, data.description || null, parentId, data.sort_order, data.is_active, id]
  );

  revalidatePath("/categories");
  return { success: true, id };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID catégorie invalide" };

  const [hasProducts, hasChildren] = await Promise.all([
    queryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
      [id]
    ),
    queryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?",
      [id]
    ),
  ]);

  if (hasProducts && hasProducts.count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer: ${hasProducts.count} produit(s) dans cette catégorie`,
    };
  }

  if (hasChildren && hasChildren.count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer: ${hasChildren.count} sous-catégorie(s) liée(s)`,
    };
  }

  const result = await execute("DELETE FROM categories WHERE id = ?", [id]);
  if (result.meta.changes === 0) {
    return { success: false, error: "Catégorie introuvable ou déjà supprimée" };
  }
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { success: true };
}
