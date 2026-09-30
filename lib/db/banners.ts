import { eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDrizzle } from "@/lib/db/drizzle";
import type { DraftAudit } from "@/lib/db/product-drafts";
import { auditLog, banners } from "@/lib/db/schema";
import type { AuditAction } from "@/lib/db/types";

/**
 * Accès bannières pour les outils MCP (lib/mcp/tools/banners.ts).
 *
 * Aucune fonction d'ici ne MODIFIE une bannière existante : toute
 * modification passe par une révision (lib/db/revisions.ts). La seule
 * écriture est `insertInactiveBanner`, qui crée une ligne que rien ne peut
 * encore afficher (`is_active = 0`, pas de `content_html`).
 */

export type BannerRow = typeof banners.$inferSelect;

/** Une bannière par id, ou `null`. */
export async function getBannerById(id: number): Promise<BannerRow | null> {
  const db = await getDrizzle();
  const row = await db.select().from(banners).where(eq(banners.id, id)).limit(1).get();
  return row ?? null;
}

export interface NewBannerFields {
  title: string;
  subtitle?: string | null;
  badge_text?: string | null;
  badge_color?: string;
  link_url: string;
  cta_text?: string;
  price?: number | null;
  bg_gradient_from?: string;
  bg_gradient_to?: string;
  starts_at?: string | null;
  ends_at?: string | null;
}

/**
 * Crée une bannière INACTIVE, sans contenu HTML, en dernière position.
 *
 * Inactive et sans HTML, volontairement : la portée d'assainissement
 * (`banner-<id>`) dépend d'un id que cet INSERT vient de produire. Le HTML
 * et l'activation voyagent donc dans une révision déposée ensuite, déjà
 * assainie avec la portée définitive — voir `create_banner`.
 *
 * L'écriture d'audit suit l'INSERT au lieu de partager son batch : l'id de
 * la ligne n'existe qu'après. Si l'audit échoue, la ligne est supprimée
 * (elle est à nous, inactive et vide : rien ne la référence encore).
 */
export async function insertInactiveBanner(fields: NewBannerFields, audit: DraftAudit): Promise<number> {
  const db = await getDrizzle();
  const [maxRow] = await db.select({ maxOrder: max(banners.display_order) }).from(banners);
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  const rows = await db
    .insert(banners)
    .values({
      title: fields.title,
      subtitle: fields.subtitle ?? null,
      badge_text: fields.badge_text ?? null,
      badge_color: fields.badge_color,
      link_url: fields.link_url,
      cta_text: fields.cta_text,
      price: fields.price ?? null,
      bg_gradient_from: fields.bg_gradient_from,
      bg_gradient_to: fields.bg_gradient_to,
      starts_at: fields.starts_at ?? null,
      ends_at: fields.ends_at ?? null,
      display_order: nextOrder,
      is_active: 0,
      content_html: null,
    })
    .returning({ id: banners.id });
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("banners insert returned no id");

  const action: AuditAction = "banner.created";
  try {
    await db.insert(auditLog).values({
      id: nanoid(),
      actor_id: audit.actor.id,
      actor_name: audit.actor.name,
      action,
      target_type: "banner",
      target_id: String(id),
      details: JSON.stringify(audit.details),
    });
  } catch (err) {
    await deleteBannerRow(id);
    throw err;
  }
  return id;
}

/** Supprime la ligne que `insertInactiveBanner` vient de créer, après un
 *  échec du dépôt de révision. N'est appelée que sur une bannière inactive
 *  sans contenu, créée par le même appel d'outil. */
export async function deleteBannerRow(id: number): Promise<void> {
  const db = await getDrizzle();
  await db.delete(banners).where(eq(banners.id, id));
}
