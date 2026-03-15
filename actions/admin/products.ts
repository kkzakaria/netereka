"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, query, queryFirst } from "@/lib/db";
import { slugify, type ActionResult } from "@/lib/utils";
import { deleteFromR2 } from "@/lib/storage/images";

const idSchema = z.string().min(1, "ID requis");

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  slug: z.string().optional().default(""),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  description: z.string().optional().default(""),
  short_description: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0, "Le prix doit être positif"),
  compare_price: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  weight_grams: z.coerce.number().int().min(0).optional(),
  meta_title: z.string().max(60).optional().default(""),
  meta_description: z.string().max(160).optional().default(""),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  is_featured: z.coerce.number().int().min(0).max(1).default(0),
});

/** @deprecated The product form uses createDraftProduct + updateProduct. This function is kept as a reference until the draft flow is confirmed stable. */
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

  // Ensure unique slug — return error like categories for consistency
  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE slug = ?",
    [data.slug]
  );
  if (existing) {
    return { success: false, error: `Un produit avec le slug "${data.slug}" existe déjà` };
  }

  await execute(
    `INSERT INTO products (id, category_id, name, slug, description, short_description, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity, low_stock_threshold, weight_grams, meta_title, meta_description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      id,
      data.category_id,
      data.name,
      data.slug,
      data.description || null,
      data.short_description || null,
      data.base_price,
      data.compare_price ?? null,
      data.sku || null,
      data.brand || null,
      data.is_active,
      data.is_featured,
      data.stock_quantity,
      data.low_stock_threshold,
      data.weight_grams ?? null,
      data.meta_title || null,
      data.meta_description || null,
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

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const raw = Object.fromEntries(formData);

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;

  // Fetch existing product to preserve slug and SKU
  const existing = await queryFirst<{ slug: string; sku: string | null; is_draft: number }>(
    "SELECT slug, sku, is_draft FROM products WHERE id = ?",
    [id]
  );
  if (!existing) return { success: false, error: "Produit introuvable" };

  // Slug: generate on first save (draft), preserve thereafter
  let finalSlug: string;
  if (existing.is_draft === 1) {
    const base = slugify(data.name);
    if (!base) return { success: false, error: "Le nom ne permet pas de générer un slug valide" };

    let candidate = base;
    let suffix = 1; // sequence: base, base-2, base-3, … (no -1 by convention)
    while (suffix <= 100) {
      const taken = await queryFirst<{ id: string }>(
        "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1",
        [candidate, id]
      );
      if (!taken) break;
      suffix++;
      candidate = `${base}-${suffix}`;
    }
    if (suffix > 100) {
      return { success: false, error: "Impossible de générer un slug unique pour ce nom" };
    }
    finalSlug = candidate;
  } else {
    finalSlug = existing.slug;
  }

  const updateSql = `UPDATE products SET
     category_id = ?, name = ?, slug = ?, description = ?, short_description = ?,
     base_price = ?, compare_price = ?, sku = ?, brand = ?,
     is_active = ?, is_featured = ?, stock_quantity = ?,
     low_stock_threshold = ?, weight_grams = ?, meta_title = ?, meta_description = ?,
     is_draft = 0, -- Clear draft flag: saving "publishes" the product
     updated_at = datetime('now')
   WHERE id = ?`;

  const buildParams = (sku: string) => [
    data.category_id,
    data.name,
    finalSlug,
    data.description || null,
    data.short_description || null,
    data.base_price,
    data.compare_price ?? null,
    sku,
    data.brand || null,
    data.is_active,
    data.is_featured,
    data.stock_quantity,
    data.low_stock_threshold,
    data.weight_grams ?? null,
    data.meta_title || null,
    data.meta_description || null,
    id,
  ];

  // SKU: generate if null (new or migrated product), preserve otherwise
  const existingSku = existing.sku;
  if (existingSku === null) {
    let skuWritten = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const generatedSku = `NET-${nanoid(8).toUpperCase()}`;
      try {
        await execute(updateSql, buildParams(generatedSku));
        skuWritten = true;
        break;
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("UNIQUE constraint failed: products.slug")) {
          return { success: false, error: "Conflit de slug, veuillez réessayer" };
        }
        if (!msg.includes("UNIQUE constraint failed: products.sku")) throw err;
        // SKU collision — retry
      }
    }
    if (!skuWritten) {
      return { success: false, error: "Impossible de générer un SKU unique, veuillez réessayer" };
    }
  } else {
    try {
      await execute(updateSql, buildParams(existingSku));
    } catch (err) {
      if ((err as Error).message.includes("UNIQUE constraint failed: products.slug")) {
        return { success: false, error: "Conflit de slug, veuillez réessayer" };
      }
      throw err;
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}/edit`);
  revalidatePath("/dashboard");
  if (existing.is_draft === 1) {
    revalidatePath("/p/" + finalSlug);
  }
  return { success: true, id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  // Fetch images to clean up R2 before DB delete
  const images = await query<{ url: string }>(
    "SELECT url FROM product_images WHERE product_id = ?",
    [id]
  );

  // Delete R2 files (best-effort, don't block on failure)
  await Promise.allSettled(
    images.map((img) => {
      const key = img.url.replace(/^\/images\//, "");
      return deleteFromR2(key);
    })
  );

  const { getDB } = await import("@/lib/cloudflare/context");
  const db = await getDB();
  await db.batch([
    db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM products WHERE id = ?").bind(id),
  ]);

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleProductActive(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  await execute(
    "UPDATE products SET is_active = 1 - is_active, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  revalidatePath("/products");
  return { success: true };
}

export async function toggleProductFeatured(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  await execute(
    "UPDATE products SET is_featured = 1 - is_featured, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  revalidatePath("/products");
  return { success: true };
}

/** Create a minimal draft product row so that images and variants can be
 *  uploaded immediately while the admin fills in the rest of the form.
 *  The draft is "published" when the form is saved (is_draft set to 0). */
export async function createDraftProduct(): Promise<ActionResult> {
  await requireAdmin();

  const id = nanoid();
  const slug = `draft-${id}`;

  try {
    await execute(
      `INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft, created_at, updated_at)
       VALUES (?, NULL, '', ?, 0, 0, 1, datetime('now'), datetime('now'))`,
      [id, slug]
    );
  } catch (error) {
    console.error("[admin/products] createDraftProduct error:", error);
    return { success: false, error: "Erreur lors de la création du brouillon" };
  }

  return { success: true, id };
}

/** Delete draft products abandoned for 24+ hours (name still empty).
 *  Also removes associated product_images, product_variants rows and R2 files. */
export async function cleanupDraftProducts(): Promise<void> {
  await requireAdmin();

  const orphanedDrafts = await query<{ id: string }>(
    `SELECT id FROM products
     WHERE is_draft = 1 AND name = ''
     AND created_at < datetime('now', '-24 hours')`
  );

  if (orphanedDrafts.length === 0) return;

  const { getDB } = await import("@/lib/cloudflare/context");
  const db = await getDB();

  for (const draft of orphanedDrafts) {
    try {
      // Clean up R2 files before DB delete (best-effort, matching deleteProduct pattern)
      const images = await query<{ url: string }>(
        "SELECT url FROM product_images WHERE product_id = ?",
        [draft.id]
      );
      await Promise.allSettled(
        images.map((img) => {
          const key = img.url.replace(/^\/images\//, "");
          return deleteFromR2(key);
        })
      );

      await db.batch([
        db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(draft.id),
        db.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(draft.id),
        db.prepare("DELETE FROM products WHERE id = ?").bind(draft.id),
      ]);
    } catch (error) {
      console.error(`[admin/products] Failed to cleanup draft id="${draft.id}":`, error);
    }
  }
}
