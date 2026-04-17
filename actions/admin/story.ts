"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { queryFirst } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/images";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

export async function uploadStoryImage(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  // Verify product exists
  const product = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE id = ?",
    [productId],
  );
  if (!product) {
    return { success: false, error: "Produit introuvable" };
  }

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

  const ext = file.name.split(".").pop() || "jpg";
  const key = `products/${productId}/story/${nanoid()}.${ext}`;

  try {
    await uploadToR2(file, key);
  } catch (error) {
    console.error(`[admin/story] R2 upload failed for product="${productId}":`, error);
    return { success: false, error: "Erreur lors de l'upload de l'image" };
  }

  return { success: true, url: key };
}
