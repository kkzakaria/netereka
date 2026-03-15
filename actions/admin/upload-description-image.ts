"use server";

import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadToR2 } from "@/lib/storage/images";

export type UploadDescriptionImageResult =
  | { success: true; key: string }
  | { success: false; error: string };

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"]);

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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { success: false, error: "Format non supporté. Utilisez JPG, PNG, GIF, WebP ou AVIF." };
  }

  const key = `description-images/${nanoid()}.${ext}`;

  try {
    await uploadToR2(file, key);
  } catch (err) {
    console.error("[uploadDescriptionImage] uploadToR2 failed", err);
    return { success: false, error: "Échec de l'upload. Veuillez réessayer." };
  }

  return { success: true, key };
}
