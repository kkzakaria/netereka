"use server";

import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadToR2 } from "@/lib/storage/images";
import { ALLOWED_IMAGE_TYPES, extensionPour } from "@/lib/storage/fetch-image";

export type UploadDescriptionImageResult =
  | { success: true; key: string }
  | { success: false; error: string };


export async function uploadDescriptionImage(
  formData: FormData
): Promise<UploadDescriptionImageResult> {
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

  // Le message invitait à déposer de l'AVIF, que le redimensionneur de la
  // vitrine ne sait pas lire sur ce plan, et contredisait frontalement celui
  // de `images.ts`, dans le même répertoire. Le GIF part avec : la liste est
  // désormais celle de toute la maison, et la production n'en comptait aucun
  // (vérifié le 2026-10-04 : zéro `.gif` et zéro `.avif` dans les
  // descriptions, et aucune image de description en service).
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return {
      success: false,
      error:
        `Format non pris en charge (${file.type || "inconnu"}). Nous n'acceptons que le JPEG, le PNG et le ` +
        "WebP. Convertissez l'image avant de la déposer.",
    };
  }

  const key = `description-images/${nanoid()}.${extensionPour(file.type)}`;

  try {
    await uploadToR2(file, key);
  } catch (err) {
    console.error("[uploadDescriptionImage] uploadToR2 failed", err);
    return { success: false, error: "Échec de l'upload. Veuillez réessayer." };
  }

  return { success: true, key };
}
