"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/images";
import type { ActionResult } from "@/lib/utils";

const bannerSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  subtitle: z.string().max(500).optional().default(""),
  badge_text: z.string().max(50).optional().default(""),
  badge_color: z.enum(["mint", "red", "orange", "blue"]).default("mint"),
  link_url: z.string().min(1, "Le lien est requis"),
  cta_text: z.string().max(50).optional().default("Découvrir"),
  price: z.coerce.number().int().min(0).optional(),
  bg_gradient_from: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#183C78"),
  bg_gradient_to: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#1E4A8F"),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.number().min(0).max(1).default(1),
  starts_at: z.string().optional().default(""),
  ends_at: z.string().optional().default(""),
});

export async function createBanner(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const db = await getDrizzle();

  const [inserted] = await db.insert(banners).values({
    title: data.title,
    subtitle: data.subtitle || null,
    badge_text: data.badge_text || null,
    badge_color: data.badge_color,
    link_url: data.link_url,
    cta_text: data.cta_text,
    price: data.price ?? null,
    bg_gradient_from: data.bg_gradient_from,
    bg_gradient_to: data.bg_gradient_to,
    display_order: data.display_order,
    is_active: data.is_active,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
  }).returning({ id: banners.id });

  revalidatePath("/banners");
  revalidatePath("/");
  return { success: true, id: String(inserted.id) };
}

export async function updateBanner(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID bannière invalide" };

  const raw = Object.fromEntries(formData);
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const db = await getDrizzle();

  await db.update(banners).set({
    title: data.title,
    subtitle: data.subtitle || null,
    badge_text: data.badge_text || null,
    badge_color: data.badge_color,
    link_url: data.link_url,
    cta_text: data.cta_text,
    price: data.price ?? null,
    bg_gradient_from: data.bg_gradient_from,
    bg_gradient_to: data.bg_gradient_to,
    display_order: data.display_order,
    is_active: data.is_active,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  }).where(eq(banners.id, id));

  revalidatePath("/banners");
  revalidatePath("/");
  return { success: true, id: String(id) };
}

export async function uploadBannerImage(
  bannerId: number,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  if (!bannerId || bannerId <= 0) return { success: false, error: "ID bannière invalide" };

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

  const db = await getDrizzle();

  // Fetch existing banner to delete old image if present
  const existing = await db.query.banners.findFirst({
    where: eq(banners.id, bannerId),
    columns: { image_url: true },
  });

  if (!existing) {
    return { success: false, error: "Bannière introuvable" };
  }

  // Delete old image from R2 if exists
  if (existing.image_url) {
    const oldKey = existing.image_url.replace(/^\/images\//, "");
    try {
      await deleteFromR2(oldKey);
    } catch {
      // R2 delete may fail in dev, continue anyway
    }
  }

  const ext = file.name.split(".").pop() || "jpg";
  const key = `banners/${bannerId}.${ext}`;

  await uploadToR2(file, key);

  const url = `/images/${key}`;
  await db.update(banners).set({
    image_url: url,
    updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  }).where(eq(banners.id, bannerId));

  revalidatePath("/banners");
  revalidatePath("/");
  return { success: true, url };
}

export async function toggleBannerActive(id: number): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID bannière invalide" };

  const db = await getDrizzle();

  // Fetch current state
  const banner = await db.query.banners.findFirst({
    where: eq(banners.id, id),
    columns: { is_active: true },
  });

  if (!banner) {
    return { success: false, error: "Bannière introuvable" };
  }

  await db.update(banners).set({
    is_active: banner.is_active === 1 ? 0 : 1,
    updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  }).where(eq(banners.id, id));

  revalidatePath("/banners");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBanner(id: number): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID bannière invalide" };

  const db = await getDrizzle();

  // Fetch banner to clean up R2 image before DB delete
  const banner = await db.query.banners.findFirst({
    where: eq(banners.id, id),
    columns: { image_url: true },
  });

  if (!banner) {
    return { success: false, error: "Bannière introuvable" };
  }

  // Delete R2 image if exists (best-effort)
  if (banner.image_url) {
    const key = banner.image_url.replace(/^\/images\//, "");
    try {
      await deleteFromR2(key);
    } catch {
      // R2 delete may fail in dev, continue anyway
    }
  }

  await db.delete(banners).where(eq(banners.id, id));

  revalidatePath("/banners");
  revalidatePath("/");
  return { success: true };
}
