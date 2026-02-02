"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, query } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/images";

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
  url?: string;
}

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

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

  const image = await query<{ url: string; is_primary: number }>(
    "SELECT url, is_primary FROM product_images WHERE id = ?",
    [imageId]
  );

  if (image.length > 0) {
    const key = image[0].url.replace(/^\/images\//, "");
    try {
      await deleteFromR2(key);
    } catch {
      // R2 delete may fail in dev, continue anyway
    }

    await execute("DELETE FROM product_images WHERE id = ?", [imageId]);

    // If deleted image was primary, make the first remaining image primary
    if (image[0].is_primary) {
      await execute(
        `UPDATE product_images SET is_primary = 1
         WHERE product_id = ? AND id = (
           SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1
         )`,
        [productId, productId]
      );
    }
  }

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}

export async function setPrimaryImage(
  imageId: string,
  productId: string
): Promise<ActionResult> {
  await requireAdmin();

  await execute(
    "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
    [productId]
  );
  await execute("UPDATE product_images SET is_primary = 1 WHERE id = ?", [
    imageId,
  ]);

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}

export async function reorderImages(
  productId: string,
  imageIds: string[]
): Promise<ActionResult> {
  await requireAdmin();

  for (let i = 0; i < imageIds.length; i++) {
    await execute(
      "UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?",
      [i, imageIds[i], productId]
    );
  }

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}
