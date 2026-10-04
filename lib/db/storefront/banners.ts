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

/**
 * LE rang dans le carrousel : `display_order`, puis `id` pour départager les
 * ex æquo. Partagé comme `displayedBannerCondition` : sans départage, deux
 * bannières de même `display_order` n'ont de rang que celui que SQLite veut
 * bien leur donner, et la position annoncée par l'écran d'un retrait pourrait
 * différer de celle du carrousel.
 */
export const displayedBannerOrder = [asc(banners.display_order), asc(banners.id)] as const;

/** Ce que `displayedBannerCondition` dit, mais LISIBLE EN JAVASCRIPT. */
export interface FenetreBanniere {
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * Les raisons pour lesquelles une bannière ne s'affiche PAS, vide quand elle
 * s'affiche. C'est la traduction JavaScript de `displayedBannerCondition`.
 *
 * Elle existe parce que deux chemins ont besoin du verdict EN MÉMOIRE, sans
 * requête : `listBanners`, qui doit dire LAQUELLE des conditions manque (un
 * booléen rendu par SQL ne le dirait pas), et l'aperçu d'une révision, qui
 * juge une bannière qui n'est pas encore en base sous cette forme. Les deux
 * écrivaient ou auraient écrit leur propre copie — une troisième lecture de
 * « affichée » était la dérive assurée.
 *
 * `!= null` et non la véracité : SQL compare la chaîne telle quelle, donc une
 * date vide (`''`) y est une date — début déjà passé, fin déjà échue. La
 * traiter ici comme « pas de date » ferait dire « affichée » à une bannière
 * que la vitrine masque. Un test d'accord aux bornes exactes lie les deux
 * (`__tests__/unit/lib/db/list-banners.test.ts`).
 */
export function raisonsDeNonAffichage(b: FenetreBanniere, now: string): BannerHiddenReason[] {
  const raisons: BannerHiddenReason[] = [];
  if (b.is_active !== 1) raisons.push("désactivée");
  if (b.starts_at != null && b.starts_at > now) raisons.push("pas encore commencée");
  if (b.ends_at != null && b.ends_at <= now) raisons.push("terminée");
  return raisons;
}

export type BannerHiddenReason = "désactivée" | "pas encore commencée" | "terminée";

export async function getActiveBanners(): Promise<Banner[]> {
  const db = await getDrizzle();

  const rows = (await db
    .select()
    .from(banners)
    .where(displayedBannerCondition(bannerClock()))
    .orderBy(...displayedBannerOrder)) as unknown as Banner[];

  return sanitizeBannerContent(rows);
}
