"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, query, queryFirst } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/images";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier sélectionné" };
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Le fichier doit être une image" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "L'image ne doit pas dépasser 5 Mo" };
  }

  const id = nanoid();
  const ext = file.name.split(".").pop() || "jpg";
  const key = `products/${productId}/${id}.${ext}`;

  await uploadToR2(file, key);

  // Check if this is the first image (make it primary)
  const existing = await query<{ id: string }>(
    "SELECT id FROM product_images WHERE product_id = ?",
    [productId]
  );
  const isPrimary = existing.length === 0 ? 1 : 0;

  const url = `/images/${key}`;
  await execute(
    `INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, productId, url, null, existing.length, isPrimary]
  );

  revalidatePath(`/products/${productId}/edit`);
  return { success: true, id, url };
}

export async function deleteProductImage(
  imageId: string,
  productId: string
): Promise<ActionResult> {
  await requireAdmin();

  const iidResult = idSchema.safeParse(imageId);
  const pidResult = idSchema.safeParse(productId);
  if (!iidResult.success || !pidResult.success) {
    return { success: false, error: "ID invalide" };
  }

  // Verify ownership: image must belong to this product
  const image = await queryFirst<{ url: string; is_primary: number }>(
    "SELECT url, is_primary FROM product_images WHERE id = ? AND product_id = ?",
    [imageId, productId]
  );

  if (!image) {
    return { success: false, error: "Image introuvable" };
  }

  const key = image.url.replace(/^\/images\//, "");
  try {
    await deleteFromR2(key);
  } catch {
    // R2 delete may fail in dev, continue anyway
  }

  await execute("DELETE FROM product_images WHERE id = ? AND product_id = ?", [
    imageId,
    productId,
  ]);

  // If deleted image was primary, make the first remaining image primary
  if (image.is_primary) {
    await execute(
      `UPDATE product_images SET is_primary = 1
       WHERE product_id = ? AND id = (
         SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1
       )`,
      [productId, productId]
    );
  }

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}

export async function setPrimaryImage(
  imageId: string,
  productId: string
): Promise<ActionResult> {
  await requireAdmin();

  const iidResult = idSchema.safeParse(imageId);
  const pidResult = idSchema.safeParse(productId);
  if (!iidResult.success || !pidResult.success) {
    return { success: false, error: "ID invalide" };
  }

  // Verify ownership: image must belong to this product
  const image = await queryFirst<{ id: string }>(
    "SELECT id FROM product_images WHERE id = ? AND product_id = ?",
    [imageId, productId]
  );
  if (!image) {
    return { success: false, error: "Image introuvable pour ce produit" };
  }

  // Must be sequential: reset all first, then set the new primary
  await execute(
    "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
    [productId]
  );
  await execute("UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?", [
    imageId,
    productId,
  ]);

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}

export async function reorderImages(
  productId: string,
  imageIds: string[]
): Promise<ActionResult> {
  await requireAdmin();

  const pidResult = idSchema.safeParse(productId);
  if (!pidResult.success) return { success: false, error: "ID produit invalide" };

  // Use D1 batch for atomicity
  const { getDB } = await import("@/lib/cloudflare/context");
  const db = await getDB();
  const statements = imageIds.map((imageId, i) =>
    db
      .prepare("UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?")
      .bind(i, imageId, productId)
  );
  await db.batch(statements);

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}
