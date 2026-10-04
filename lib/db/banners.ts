import { eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDrizzle } from "@/lib/db/drizzle";
import type { DraftAudit } from "@/lib/db/product-drafts";
import { auditLog, banners } from "@/lib/db/schema";
import { bannerClock, displayedBannerOrder, raisonsDeNonAffichage, type BannerHiddenReason } from "@/lib/db/storefront/banners";
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

export type { BannerHiddenReason };

/** Une bannière telle que `list_banners` la rend : de quoi l'IDENTIFIER, pas la relire. */
export interface BannerSummary {
  id: number;
  title: string;
  link_url: string;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  /** Rang dans le carrousel, à partir de 1 — `null` si la bannière ne s'affiche pas en ce moment. */
  carousel_position: number | null;
  /**
   * TOUTES les raisons qui l'empêchent de s'afficher, vide quand elle
   * s'affiche. Un tableau et non une raison unique : une bannière peut être
   * désactivée ET terminée, et n'annoncer que la première ferait croire qu'une
   * réactivation suffit à la faire revenir.
   */
  not_displayed_because: BannerHiddenReason[];
  has_content_html: boolean;
  has_image: boolean;
}

/**
 * Toutes les bannières, dans l'ordre du carrousel.
 *
 * Elle existe parce qu'un assistant en service a brûlé trois échanges à
 * deviner un identifiant le 2026-10-02 : `get_banner` exige un numéro, rien ne
 * permettait de l'obtenir, et « la bannière 0 » voulait dire la PREMIÈRE du
 * carrousel — une position, pas un identifiant. D'où `carousel_position`, qui
 * traduit exactement ce que l'administrateur voit.
 *
 * Elle ne rend PAS `content_html` : jusqu'à 512 Ko par bannière, et le but est
 * d'identifier, pas de relire — `get_banner` est là pour ça. Un simple drapeau
 * dit s'il y en a un.
 *
 * Elle le LIT en revanche, avec toute la ligne : la table compte une poignée
 * de lignes, écrites par des administrateurs et jamais par un visiteur (4 en
 * production le 2026-10-03, 1257 octets de HTML en tout, 401 au maximum). À
 * projeter si elle grossit — c'est une dette assumée et datée, pas un oubli.
 * `listPendingRevisionHandles`, elle, projette : la file d'attente n'est
 * bornée par rien et chaque payload porte un `content_html` proposé.
 *
 * « Affichée » répète en JavaScript le prédicat SQL `displayedBannerCondition`
 * — elle ne l'APPELLE pas, parce qu'elle doit dire LAQUELLE des conditions
 * manque, ce qu'un booléen rendu par SQL ne dirait pas. Les deux définitions
 * sont donc liées par un test d'accord aux bornes exactes
 * (`__tests__/unit/lib/db/list-banners.test.ts`), seul garde-fou contre leur
 * divergence.
 */
export async function listBanners(): Promise<BannerSummary[]> {
  const db = await getDrizzle();
  const now = bannerClock();
  const rows = await db.select().from(banners).orderBy(...displayedBannerOrder).all();

  let rang = 0;
  return rows.map((b) => {
    // Le verdict vient de `raisonsDeNonAffichage`, partagé avec l'aperçu
    // d'une révision : une seconde lecture de « affichée » dériverait.
    const raisons = raisonsDeNonAffichage(b, now);
    const affichee = raisons.length === 0;
    if (affichee) rang += 1;
    return {
      id: b.id,
      title: b.title,
      link_url: b.link_url,
      is_active: b.is_active === 1,
      display_order: b.display_order,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      carousel_position: affichee ? rang : null,
      not_displayed_because: raisons,
      has_content_html: !!b.content_html && b.content_html.trim().length > 0,
      has_image: !!b.image_url && b.image_url.trim().length > 0,
    };
  });
}
