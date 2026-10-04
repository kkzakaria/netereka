"use server";

import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadToR2 } from "@/lib/storage/images";
import { verifierImageTeleversee } from "@/lib/storage/verifier-image";

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
  // de `images.ts`, dans le même répertoire. Le GIF part avec — y compris le
  // GIF ANIMÉ, qui n'est donc plus pris en charge dans les descriptions : la
  // liste est celle de toute la maison, et la production n'en comptait aucun
  // (vérifié le 2026-10-04 : zéro `.gif` et zéro `.avif` dans les
  // descriptions, et aucune image de description en service).
  const verif = await verifierImageTeleversee(file);
  if (!verif.ok) return { success: false, error: verif.erreur };

  const key = `description-images/${nanoid()}.${verif.extension}`;

  try {
    await uploadToR2(file, key);
  } catch (err) {
    console.error("[uploadDescriptionImage] uploadToR2 failed", err);
    return { success: false, error: "Échec de l'upload. Veuillez réessayer." };
  }

  return { success: true, key };
}
