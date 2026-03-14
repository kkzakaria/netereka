"use server";

import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadToR2 } from "@/lib/storage/images";

export interface UploadDescriptionImageResult {
  success: boolean;
  key?: string;
  error?: string;
}

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

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `description-images/${nanoid()}.${ext}`;

  await uploadToR2(file, key);

  return { success: true, key };
}
