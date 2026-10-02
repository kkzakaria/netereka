import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { bannerTemplateToHtml } from "@/lib/content/banner-to-html";

/**
 * Décide, pour une ligne donnée, ce que la conversion doit écrire.
 *
 * Tout le jugement est ici ; scripts/convert-content-to-html.ts n'est qu'une
 * coquille qui lit la base, appelle ces fonctions et écrit le résultat. Ce
 * découpage existe pour une raison simple : un CLI n'est pas testable dans ce
 * dépôt, une fonction pure l'est.
 *
 * `planProduct` a été retirée : les quatre colonnes Story qu'elle lisait ont
 * quitté le schéma, et elles étaient vides sur les 1068 fiches de production —
 * la conversion des produits est terminée, il n'y a plus de matière. Il ne
 * reste donc que le volet bannières. Lui aussi est à sec (0 des 4 bannières
 * de production n'a `content_html` vide) ; son retrait appartient à une autre
 * PR que celle-ci, qui ne touche qu'au contrat Story.
 */

export interface BannerRow {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  price: number | null;
  cta_text: string | null;
  link_url: string;
  content_html: string | null;
}

export type Plan<T> =
  | { action: "skip"; reason: string }
  | { action: "convert"; updates: T };

function blank(v: string | null): boolean {
  return v == null || v.trim() === "";
}

export function planBanner(row: BannerRow): Plan<{ content_html: string }> {
  if (!blank(row.content_html)) {
    return { action: "skip", reason: "déjà converti" };
  }

  const html = bannerTemplateToHtml({
    title: row.title,
    subtitle: row.subtitle,
    badge_text: row.badge_text,
    price: row.price,
    cta_text: row.cta_text,
    link_url: row.link_url,
  });

  return {
    action: "convert",
    updates: { content_html: sanitizeDescriptionHtml(html, `banner-${row.id}`) },
  };
}
