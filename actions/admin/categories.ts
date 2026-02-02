"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { slugify, type ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

const categorySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  slug: z.string().min(1),
  description: z.string().optional().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.number().min(0).max(1).default(1),
});

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
  const id = nanoid();

  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM categories WHERE slug = ?",
    [data.slug]
  );
  if (existing) {
    return { success: false, error: "Une catégorie avec ce slug existe déjà" };
  }

  await execute(
    `INSERT INTO categories (id, name, slug, description, sort_order, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, data.name, data.slug, data.description || null, data.sort_order, data.is_active]
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

  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM categories WHERE slug = ? AND id != ?",
    [data.slug, id]
  );
  if (existing) {
    return { success: false, error: "Une catégorie avec ce slug existe déjà" };
  }

  await execute(
    `UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [data.name, data.slug, data.description || null, data.sort_order, data.is_active, id]
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

  await execute("DELETE FROM categories WHERE id = ?", [id]);
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { success: true };
}
