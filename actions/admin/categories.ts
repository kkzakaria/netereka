"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst, query } from "@/lib/db";
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

async function getDepth(categoryId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = categoryId;
  while (currentId) {
    const cat: { parent_id: string | null } | null = await queryFirst<{ parent_id: string | null }>(
      "SELECT parent_id FROM categories WHERE id = ?",
      [currentId]
    );
    if (!cat || !cat.parent_id) break;
    depth++;
    currentId = cat.parent_id;
  }
  return depth;
}

async function isDescendantOf(categoryId: string, potentialAncestorId: string): Promise<boolean> {
  const descendants = await query<{ id: string }>(
    `WITH RECURSIVE descendants AS (
      SELECT id FROM categories WHERE parent_id = ?
      UNION ALL
      SELECT c.id FROM categories c
      JOIN descendants d ON c.parent_id = d.id
    )
    SELECT id FROM descendants`,
    [potentialAncestorId]
  );
  return descendants.some((d) => d.id === categoryId);
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

  // Validate depth: parent must exist and result in max 2 levels
  if (parentId) {
    const parent = await queryFirst<{ id: string }>(
      "SELECT id FROM categories WHERE id = ?",
      [parentId]
    );
    if (!parent) {
      return { success: false, error: "Catégorie parente introuvable" };
    }
    const parentDepth = await getDepth(parentId);
    if (parentDepth >= 2) {
      return { success: false, error: "Profondeur maximale atteinte (2 niveaux)" };
    }
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

  // Prevent circular references: new parent must not be a descendant
  if (parentId) {
    const parent = await queryFirst<{ id: string }>(
      "SELECT id FROM categories WHERE id = ?",
      [parentId]
    );
    if (!parent) {
      return { success: false, error: "Catégorie parente introuvable" };
    }

    if (await isDescendantOf(parentId, id)) {
      return { success: false, error: "Référence circulaire : le parent est un descendant de cette catégorie" };
    }

    const parentDepth = await getDepth(parentId);
    if (parentDepth >= 2) {
      return { success: false, error: "Profondeur maximale atteinte (2 niveaux)" };
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

  const hasProducts = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
    [id]
  );
  if (hasProducts && hasProducts.count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer: ${hasProducts.count} produit(s) dans cette catégorie`,
    };
  }

  const hasChildren = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?",
    [id]
  );
  if (hasChildren && hasChildren.count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer: ${hasChildren.count} sous-catégorie(s) liée(s)`,
    };
  }

  await execute("DELETE FROM categories WHERE id = ?", [id]);
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { success: true };
}
