"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { uploadToR2 } from "@/lib/storage/images";
import { ALLOWED_IMAGE_TYPES, extensionPour } from "@/lib/storage/fetch-image";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");


export async function uploadStoryImage(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const db = await getDrizzle();
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true },
  });
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

  // Le TYPE décide, et l'extension en découle — jamais le nom du fichier,
  // qui ment sans effort. Même porte que `uploadProductImage`, même liste.
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return {
      success: false,
      error:
        `Format non pris en charge (${file.type || "inconnu"}). Nous n'acceptons que le JPEG, le PNG et le ` +
        "WebP. Convertissez l'image avant de la déposer.",
    };
  }
  const key = `products/${productId}/story/${nanoid()}.${extensionPour(file.type)}`;

  try {
    await uploadToR2(file, key);
  } catch (error) {
    console.error(`[admin/story] R2 upload failed for product="${productId}":`, error);
    return { success: false, error: "Erreur lors de l'upload de l'image" };
  }

  return { success: true, url: key };
}
