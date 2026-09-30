import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { eq, and, or, isNull, lte, gt, asc, type SQL } from "drizzle-orm";
import type { Banner } from "@/lib/db/types";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

/** Défense en profondeur : `content_html` est assaini à l'écriture, mais cette
 *  garantie suppose que tout écrivain futur y pense — l'éditeur admin, les
 *  outils MCP. Ré-assainir ici est idempotent, se fait côté serveur, et ne coûte
 *  donc rien au bundle navigateur. Le scopeId doit rester `banner-<id>` : c'est
 *  celui inscrit dans le HTML stocké, et en changer casserait le CSS de l'auteur. */
export function sanitizeBannerContent(rows: Banner[]): Banner[] {
  return rows.map((b) => ({
    ...b,
    content_html: b.content_html
      ? sanitizeDescriptionHtml(b.content_html, `banner-${b.id}`)
      : null,
  }));
}

/** Horodatage au format de `starts_at`/`ends_at` (comparés comme des chaînes). */
export function bannerClock(date: Date = new Date()): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

/**
 * LA définition de « affichée en ce moment » : active ET dans sa fenêtre.
 * Partagée par le carrousel (`getActiveBanners`), le préchargement du hero et
 * l'écran d'un retrait (lib/db/withdraw-impact.ts) : un écran qui mesurerait
 * « ce qui disparaît » avec une condition écrite à part pourrait annoncer
 * qu'une bannière est visible quand la vitrine ne l'affiche pas.
 */
export function displayedBannerCondition(now: string): SQL | undefined {
  return and(
    eq(banners.is_active, 1),
    or(isNull(banners.starts_at), lte(banners.starts_at, now)),
    or(isNull(banners.ends_at), gt(banners.ends_at, now)),
  );
}

export async function getActiveBanners(): Promise<Banner[]> {
  const db = await getDrizzle();

  const rows = (await db
    .select()
    .from(banners)
    .where(displayedBannerCondition(bannerClock()))
    .orderBy(asc(banners.display_order))) as unknown as Banner[];

  return sanitizeBannerContent(rows);
}
