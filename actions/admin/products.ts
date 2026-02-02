"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  slug: z.string().min(1),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  description: z.string().optional().default(""),
  short_description: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0, "Le prix doit être positif"),
  compare_price: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.number().min(0).max(1).default(1),
  is_featured: z.coerce.number().min(0).max(1).default(0),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  if (!raw.slug || (raw.slug as string).trim() === "") {
    raw.slug = slugify(raw.name as string);
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const id = nanoid();

  // Ensure unique slug
  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE slug = ?",
    [data.slug]
  );
  if (existing) {
    data.slug = `${data.slug}-${nanoid(6)}`;
  }

  await execute(
    `INSERT INTO products (id, category_id, name, slug, description, short_description, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      id,
      data.category_id,
      data.name,
      data.slug,
      data.description || null,
      data.short_description || null,
      data.base_price,
      data.compare_price || null,
      data.sku || null,
      data.brand || null,
      data.is_active,
      data.is_featured,
      data.stock_quantity,
    ]
  );

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true, id };
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  if (!raw.slug || (raw.slug as string).trim() === "") {
    raw.slug = slugify(raw.name as string);
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;

  // Ensure unique slug (excluding self)
  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE slug = ? AND id != ?",
    [data.slug, id]
  );
  if (existing) {
    data.slug = `${data.slug}-${nanoid(6)}`;
  }

  await execute(
    `UPDATE products SET
       category_id = ?, name = ?, slug = ?, description = ?, short_description = ?,
       base_price = ?, compare_price = ?, sku = ?, brand = ?,
       is_active = ?, is_featured = ?, stock_quantity = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.category_id,
      data.name,
      data.slug,
      data.description || null,
      data.short_description || null,
      data.base_price,
      data.compare_price || null,
      data.sku || null,
      data.brand || null,
      data.is_active,
      data.is_featured,
      data.stock_quantity,
      id,
    ]
  );

  revalidatePath("/products");
  revalidatePath(`/products/${id}/edit`);
  revalidatePath("/dashboard");
  return { success: true, id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  await execute("DELETE FROM product_images WHERE product_id = ?", [id]);
  await execute("DELETE FROM product_variants WHERE product_id = ?", [id]);
  await execute("DELETE FROM products WHERE id = ?", [id]);

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleProductActive(id: string): Promise<ActionResult> {
  await requireAdmin();
  await execute(
    "UPDATE products SET is_active = 1 - is_active, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  revalidatePath("/products");
  return { success: true };
}

export async function toggleProductFeatured(id: string): Promise<ActionResult> {
  await requireAdmin();
  await execute(
    "UPDATE products SET is_featured = 1 - is_featured, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  revalidatePath("/products");
  return { success: true };
}
