"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, query, queryFirst } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/images";
import type { ActionResult } from "@/lib/utils";
import { verifierImageTeleversee } from "@/lib/storage/verifier-image";

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

  // La même liste que le téléchargement MCP (lib/storage/fetch-image.ts), pas
  // une copie : deux sources pour une même vérité divergent au premier format
  // ajouté, et c'est par cette porte-ci qu'un AVIF entrerait sinon.
  //
  // `image/*` suffisait avant le 2026-10-02. Ce jour-là, trois images d'une
  // fiche publiée ne s'affichaient pas — « ERROR 9520 » — parce que la vitrine
  // sert tout par /cdn-cgi/image/ et que Cloudflare ne lit l'AVIF en entrée que
  // sur un plan Enterprise. Un administrateur qui dépose un .avif depuis son
  // ordinateur produisait exactement la même image invisible.
  //
  // La liste est plus étroite que ce que Cloudflare sait lire : il accepte
  // aussi le GIF, le SVG et le HEIC sur tous les plans. C'est NOTRE choix, pas
  // sa limite — le message au-dessus le dit ainsi, après avoir un temps
  // attribué la restriction au service, ce qui aurait envoyé un administrateur
  // convertir un GIF parfaitement transformable pour un motif inventé.
  // Les OCTETS décident, pas la déclaration : un navigateur déduit
  // `File.type` de l'EXTENSION, donc un « photo.avif » renommé « photo.png »
  // arrive en `image/png` sans que personne n'ait menti. La porte partagée
  // lit les douze premiers octets et c'est eux qui donnent l'extension de la
  // clé ET le Content-Type stocké sur l'objet R2.
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "L'image ne doit pas dépasser 5 Mo" };
  }

  const verif = await verifierImageTeleversee(file);
  if (!verif.ok) return { success: false, error: verif.erreur };

  const id = nanoid();
  const ext = verif.extension;
  const key = `products/${productId}/${id}.${ext}`;

  await uploadToR2(file, key);

  // Check if this is the first image (make it primary)
  const existing = await query<{ id: string }>(
    "SELECT id FROM product_images WHERE product_id = ?",
    [productId]
  );
  const isPrimary = existing.length === 0 ? 1 : 0;

  const url = key;
  const variantIdRaw = (formData.get("variant_id") as string) || null;
  const variantId = variantIdRaw && idSchema.safeParse(variantIdRaw).success ? variantIdRaw : null;

  try {
    await execute(
      `INSERT INTO product_images (id, product_id, variant_id, url, alt, sort_order, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, productId, variantId, url, null, existing.length, isPrimary]
    );
  } catch (error) {
    console.error(`[admin/images] DB insert failed for image="${id}":`, error);
    try { await deleteFromR2(key); } catch { /* cleanup best-effort */ }
    return { success: false, error: "Erreur lors de l'enregistrement de l'image" };
  }

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

export async function setImageVariant(
  imageId: string,
  productId: string,
  variantId: string | null,
): Promise<ActionResult> {
  await requireAdmin();

  const iidResult = idSchema.safeParse(imageId);
  const pidResult = idSchema.safeParse(productId);
  if (!iidResult.success || !pidResult.success) {
    return { success: false, error: "ID invalide" };
  }

  if (variantId !== null) {
    const vidResult = idSchema.safeParse(variantId);
    if (!vidResult.success) {
      return { success: false, error: "ID de variante invalide" };
    }
  }

  // Verify ownership
  const image = await queryFirst<{ id: string }>(
    "SELECT id FROM product_images WHERE id = ? AND product_id = ?",
    [imageId, productId],
  );
  if (!image) {
    return { success: false, error: "Image introuvable pour ce produit" };
  }

  try {
    await execute(
      "UPDATE product_images SET variant_id = ? WHERE id = ? AND product_id = ?",
      [variantId, imageId, productId],
    );
  } catch (error) {
    console.error(`[admin/images] setImageVariant failed for image="${imageId}":`, error);
    return { success: false, error: "Erreur lors de l'association image-variante" };
  }

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
