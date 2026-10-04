"use server";

import { revalidatePath } from "next/cache";
import { eq, and, max, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { banners, bannerGradients, contentRevisions } from "@/lib/db/schema";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/images";
import { ALLOWED_IMAGE_TYPES, extensionPour } from "@/lib/storage/fetch-image";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { refreshHeroPreload } from "@/lib/cloudflare/hero-preload";
import type { ActionResult } from "@/lib/utils";
import type { BannerGradient } from "@/lib/db/types";


const bannerSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  subtitle: z.string().max(500).optional().default(""),
  badge_text: z.string().max(50).optional().default(""),
  badge_color: z.enum(["mint", "red", "orange", "blue"]).default("mint"),
  link_url: z.string().min(1, "Le lien est requis").refine(
    (val) => val.startsWith("/"),
    "Le lien doit être un chemin relatif (ex: /p/produit)"
  ),
  cta_text: z.string().max(50).optional().default("Découvrir"),
  price: z.coerce.number().int().min(0).optional(),
  bg_gradient_from: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#183C78"),
  bg_gradient_to: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#1E4A8F"),
  // Borne haute alignée sur MAX_INPUT_LENGTH de sanitizeDescriptionHtml.
  content_html: z.string().max(512_000).optional().default(""),
  // Only consumed by updateBanner — createBanner ignores this and computes display_order from max().
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.number().min(0).max(1).default(1),
  starts_at: z.string().optional().default(""),
  ends_at: z.string().optional().default(""),
}).refine(
  (data) => {
    if (data.starts_at && data.ends_at) {
      return data.starts_at < data.ends_at;
    }
    return true;
  },
  { message: "La date de fin doit être postérieure à la date de début" }
);

export async function createBanner(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  try {
    const data = parsed.data;
    const db = await getDrizzle();

    // SQL MAX() on an empty table returns one row with NULL — not an empty array.
    // maxRow is always defined; maxRow.maxOrder is null when the table is empty.
    let nextOrder: number;
    try {
      const [maxRow] = await db.select({ maxOrder: max(banners.display_order) }).from(banners);
      nextOrder = (maxRow.maxOrder ?? -1) + 1; // null when table is empty → start at 0
    } catch (orderError) {
      console.error("[admin/banners] createBanner: failed to compute max display_order:", orderError);
      return { success: false, error: "Impossible de calculer l'ordre d'affichage. Veuillez réessayer." };
    }

    const rows = await db.insert(banners).values({
      title: data.title,
      subtitle: data.subtitle || null,
      badge_text: data.badge_text || null,
      badge_color: data.badge_color,
      link_url: data.link_url,
      cta_text: data.cta_text,
      price: data.price ?? null,
      bg_gradient_from: data.bg_gradient_from,
      bg_gradient_to: data.bg_gradient_to,
      display_order: nextOrder,
      is_active: data.is_active,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    }).returning({ id: banners.id });

    const inserted = rows[0];
    if (!inserted) {
      return { success: false, error: "Échec de la création de la bannière" };
    }

    // Le scoping CSS est inscrit dans le HTML stocké et dépend de l'identifiant,
    // qui n'existe qu'après l'INSERT. D'où ce second passage : il n'y a pas de
    // façon d'assainir correctement avant de connaître l'id.
    if (data.content_html) {
      try {
        await db
          .update(banners)
          .set({ content_html: sanitizeDescriptionHtml(data.content_html, `banner-${inserted.id}`) })
          .where(eq(banners.id, inserted.id));
      } catch (updateError) {
        // La ligne existe déjà mais sans son contenu assaini : la laisser en
        // l'état exposerait une bannière fantôme et, en cas de nouvel essai,
        // un doublon. On la supprime pour repartir propre.
        console.error("[admin/banners] createBanner: échec de l'assainissement, rollback:", updateError);
        try {
          await db.delete(banners).where(eq(banners.id, inserted.id));
        } catch (deleteError) {
          console.error(
            `[admin/banners] createBanner: échec du rollback, bannière orpheline id=${inserted.id}:`,
            deleteError
          );
          return {
            success: false,
            error: `Échec de la création de la bannière et du nettoyage automatique (id=${inserted.id}). Contactez un administrateur.`,
          };
        }
        return { success: false, error: "Échec de la création de la bannière. Veuillez réessayer." };
      }
    }

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true, id: String(inserted.id) };
  } catch (error) {
    console.error("[admin/banners] createBanner error:", error);
    return { success: false, error: "Erreur lors de la création de la bannière" };
  }
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

  try {
    const data = parsed.data;
    const db = await getDrizzle();

    const existing = await db.query.banners.findFirst({
      where: eq(banners.id, id),
      columns: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Bannière introuvable" };
    }

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
      content_html: data.content_html
        ? sanitizeDescriptionHtml(data.content_html, `banner-${id}`)
        : null,
      display_order: data.display_order,
      is_active: data.is_active,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
      updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    }).where(eq(banners.id, id));

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true, id: String(id) };
  } catch (error) {
    console.error("[admin/banners] updateBanner error:", error);
    return { success: false, error: "Erreur lors de la mise à jour de la bannière" };
  }
}

/**
 * Efface l'image R2 qu'une bannière ne montre plus. Meilleur effort : le
 * remplacement est déjà acté en base, et un échec ici ne doit pas le défaire
 * — seulement laisser une trace pour retrouver l'objet.
 */
async function deleteOldBannerImage(previous: string | null, bannerId: number): Promise<void> {
  if (!previous) return;
  const oldKey = previous.replace(/^\/images\//, "");
  try {
    await deleteFromR2(oldKey);
  } catch (deleteError) {
    // La clé en ARGUMENT et non interpolée dans le message : elle vient
    // d'une colonne, donc d'une saisie, et CodeQL la voit comme une chaîne
    // de format teintée (`js/tainted-format-string`).
    console.error("[admin/banners] suppression R2 de l'ancienne image échouée", { key: oldKey, bannerId }, deleteError);
  }
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

  // Le TYPE décide, pas le nom du fichier. Deux raisons, et la seconde est
  // propre aux bannières : l'AVIF passait, et le préchargement LCP du hero
  // construit son URL `/cdn-cgi/image/…` À LA MAIN
  // (`lib/cloudflare/hero-preload.ts`), sans passer par le chargeur qui sert
  // les AVIF bruts. Une bannière en AVIF s'affichait donc, mais son
  // préchargement partait vers une URL répondant « ERROR 9520 » : l'élément
  // LCP de la page d'accueil, non préchargé, sans que rien ne le dise.
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return {
      success: false,
      error:
        `Format non pris en charge (${file.type || "inconnu"}). Nous n'acceptons que le JPEG, le PNG et le ` +
        "WebP. Convertissez l'image avant de la déposer.",
    };
  }

  try {
    const db = await getDrizzle();

    const existing = await db.query.banners.findFirst({
      where: eq(banners.id, bannerId),
      columns: { image_url: true },
    });

    if (!existing) {
      return { success: false, error: "Bannière introuvable" };
    }

    const uid = nanoid(8);
    // L'extension vient du TYPE : un « photo.avif » renommé « photo.png »
    // aurait produit une clé .png portant des octets AVIF, que le repli du
    // chargeur — qui teste l'extension — ne reconnaîtrait pas.
    const key = `banners/${bannerId}-${uid}.${extensionPour(file.type)}`;

    await uploadToR2(file, key);

    const url = key;
    // L'objet est DÉJÀ en R2 : si l'écriture lève, ou ne touche aucune ligne
    // (bannière supprimée entre la lecture et ici), plus rien ne le nommera.
    // Sans ce nettoyage, l'action rendait même `success` pour une écriture
    // qui n'avait rien écrit — le visuel semblait posé, la bannière était
    // inchangée, et l'objet restait.
    try {
      const written = await db.update(banners).set({
        image_url: url,
        updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      }).where(eq(banners.id, bannerId));
      if ((written as { meta?: { changes?: number } })?.meta?.changes === 0) {
        await deleteOldBannerImage(url, bannerId);
        return { success: false, error: "Bannière introuvable" };
      }
    } catch (writeError) {
      await deleteOldBannerImage(url, bannerId);
      throw writeError;
    }

    // L'ancienne image n'est effacée qu'APRÈS que la nouvelle est en place et
    // que la ligne la désigne. L'ordre inverse — effacer d'abord — laissait la
    // bannière pointer une clé supprimée dès que le téléversement ou l'écriture
    // échouait : une bannière en ligne sans visuel, pour une opération qui
    // avait échoué. Même ordre que le chemin révision (`applyRevision`,
    // lib/db/revisions.ts), où l'effacement est un `afterCommit`.
    await deleteOldBannerImage(existing.image_url, bannerId);

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true, url };
  } catch (error) {
    console.error("[admin/banners] uploadBannerImage error:", error);
    return { success: false, error: "Erreur lors de l'upload de l'image" };
  }
}

export async function setBannerImageUrl(
  bannerId: number,
  imageUrl: string
): Promise<ActionResult> {
  await requireAdmin();

  if (!bannerId || bannerId <= 0) return { success: false, error: "ID bannière invalide" };
  // Accept both "banners/key.png" (new) and legacy "/images/banners/key.png" format
  const imageKey = (imageUrl.startsWith("/images/") ? imageUrl.slice("/images/".length) : imageUrl).trim();
  if (!imageKey || imageKey.startsWith("/") || imageKey.includes("..")) {
    return { success: false, error: "URL d'image invalide" };
  }

  try {
    const db = await getDrizzle();

    const existing = await db.query.banners.findFirst({
      where: eq(banners.id, bannerId),
      columns: { image_url: true },
    });

    if (!existing) {
      return { success: false, error: "Bannière introuvable" };
    }

    await db.update(banners).set({
      image_url: imageKey,
      updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    }).where(eq(banners.id, bannerId));

    // Effacé après l'écriture, et jamais si c'est la MÊME clé : reposer
    // l'image déjà en place effacerait celle que la ligne vient de confirmer.
    if (existing.image_url !== imageKey) await deleteOldBannerImage(existing.image_url, bannerId);

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true, url: imageKey };
  } catch (error) {
    console.error("[admin/banners] setBannerImageUrl error:", error);
    return { success: false, error: "Erreur lors de la mise à jour de l'image" };
  }
}

export async function toggleBannerActive(id: number): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID bannière invalide" };

  try {
    const db = await getDrizzle();

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
    await refreshHeroPreload();
    return { success: true };
  } catch (error) {
    console.error("[admin/banners] toggleBannerActive error:", error);
    return { success: false, error: "Erreur lors du changement de statut" };
  }
}

export async function deleteBanner(id: number): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID bannière invalide" };

  try {
    const db = await getDrizzle();

    const banner = await db.query.banners.findFirst({
      where: eq(banners.id, id),
      columns: { image_url: true },
    });

    if (!banner) {
      return { success: false, error: "Bannière introuvable" };
    }

    // Les révisions encore en attente sur cette bannière sont lues AVANT la
    // suppression : elles vont désigner une cible absente, et leur écran de
    // détail est alors un 404 que personne ne saurait plus résoudre — ni
    // appliquer, ni rejeter. L'image que `set_banner_image` leur a fait
    // téléverser n'aurait donc plus aucun chemin vers l'effacement.
    const enAttente = await db
      .select({ id: contentRevisions.id, payload: contentRevisions.payload })
      .from(contentRevisions)
      .where(and(
        eq(contentRevisions.target_type, "banner"),
        eq(contentRevisions.target_id, String(id)),
        eq(contentRevisions.status, "pending"),
      ));

    await db.batch([
      db.delete(banners).where(eq(banners.id, id)),
      db
        .update(contentRevisions)
        .set({ status: "superseded", resolved_at: sql`datetime('now')` })
        .where(and(
          eq(contentRevisions.target_type, "banner"),
          eq(contentRevisions.target_id, String(id)),
          eq(contentRevisions.status, "pending"),
        )),
    ]);

    // Après la suppression, jamais avant : l'ordre inverse laissait, si
    // l'écriture échouait, une bannière en ligne désignant une clé effacée.
    // Même raison que dans `uploadBannerImage`.
    await deleteOldBannerImage(banner.image_url, id);
    for (const rev of enAttente) {
      let key: unknown;
      try {
        key = (JSON.parse(rev.payload) as { image_url?: unknown }).image_url;
      } catch (e) {
        console.error("[admin/banners] payload illisible au nettoyage R2", { revisionId: rev.id }, e);
        continue;
      }
      if (typeof key === "string" && key.length > 0) await deleteOldBannerImage(key, id);
    }

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true };
  } catch (error) {
    console.error("[admin/banners] deleteBanner error:", error);
    return { success: false, error: "Erreur lors de la suppression de la bannière" };
  }
}

const gradientSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  color_from: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format: #RRGGBB)"),
  color_to: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format: #RRGGBB)"),
});

export async function createBannerGradient(
  input: { name: string; color_from: string; color_to: string }
): Promise<ActionResult & { gradient?: BannerGradient }> {
  await requireAdmin();

  const parsed = gradientSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  try {
    const db = await getDrizzle();
    const rows = await db.insert(bannerGradients).values({
      name: parsed.data.name,
      color_from: parsed.data.color_from,
      color_to: parsed.data.color_to,
    }).returning({
      id: bannerGradients.id,
      name: bannerGradients.name,
      color_from: bannerGradients.color_from,
      color_to: bannerGradients.color_to,
      created_at: bannerGradients.created_at,
    });

    const gradient = rows[0];
    if (!gradient) {
      return { success: false, error: "Échec de la création du dégradé" };
    }

    revalidatePath("/banners");
    return { success: true, gradient: gradient as BannerGradient };
  } catch (error) {
    console.error("[admin/banners] createBannerGradient error:", error);
    return { success: false, error: "Erreur lors de la création du dégradé" };
  }
}

export async function deleteBannerGradient(id: number): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID de dégradé invalide" };

  try {
    const db = await getDrizzle();
    const deleted = await db.delete(bannerGradients)
      .where(eq(bannerGradients.id, id))
      .returning({ id: bannerGradients.id });

    if (deleted.length === 0) {
      return { success: false, error: "Dégradé introuvable" };
    }
    revalidatePath("/banners");
    return { success: true };
  } catch (error) {
    console.error("[admin/banners] deleteBannerGradient error:", error);
    return { success: false, error: "Erreur lors de la suppression du dégradé" };
  }
}

export async function reorderBanners(orderedIds: number[]): Promise<ActionResult> {
  await requireAdmin();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { success: true };
  }

  if (orderedIds.length > 100) {
    return { success: false, error: "Trop de bannières" };
  }

  if (orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { success: false, error: "Données de réorganisation invalides" };
  }

  if (new Set(orderedIds).size !== orderedIds.length) {
    return { success: false, error: "Données de réorganisation invalides (doublons)" };
  }

  try {
    const db = await getDrizzle();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(banners)
        .set({ display_order: i, updated_at: now })
        .where(eq(banners.id, orderedIds[i]));
    }

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true };
  } catch (error) {
    console.error("[admin/banners] reorderBanners error:", error);
    return { success: false, error: "Erreur lors de la mise à jour de l'ordre" };
  }
}
