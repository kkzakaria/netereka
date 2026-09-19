import { formatPrice } from "@/lib/utils/format";

/**
 * Convertit le gabarit de bannière en contenu libre.
 *
 * Ne convertit QUE le contenu textuel de la carte de verre : badge, titre,
 * sous-titre, prix, bouton. Le dégradé de fond, l'image et le carrousel restent
 * rendus par React (décision 1 du spec) — c'est ce qui préserve next/image et
 * le preload LCP.
 *
 * Le HTML produit est posé au-dessus d'un fond sombre par hero-banner.tsx :
 * les classes `nk-banner-*` définies dans globals.css lui donnent la carte
 * translucide qu'il avait, sans réintroduire de couleur littérale.
 */

export interface BannerTemplateInput {
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  price: number | null;
  cta_text: string | null;
  link_url: string;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Le gabarit ne produit que des liens internes : l'admin impose déjà un chemin
 *  relatif à l'écriture, et le sanitizer filtre les schémas en aval. Ce garde
 *  existe pour que le module tienne sa propre garantie plutôt que de l'emprunter
 *  à ses appelants. Une valeur hors allowlist retombe sur l'accueil, ce qui est
 *  visible, plutôt que sur un lien mort. */
function safeHref(url: string): string {
  // Un navigateur retire tab, LF et CR d'une URL avant de l'analyser — mais il
  // ENCODE l'espace au lieu de le supprimer, donc le retirer changerait la
  // destination. On retire donc exactement ce qu'il retire, on refuse tout autre
  // caractère de contrôle plutôt que de réécrire l'URL en silence, et on laisse
  // l'espace au navigateur. Même doctrine que isSafeUri dans
  // lib/utils/sanitize-html.ts : normaliser pour DÉCIDER, sans inventer une URL
  // que l'auteur n'a pas écrite.
  //
  // `.trim()` en retirait plus que cela : il retire tout ce que `String.prototype
  // .trim` considère comme un espace Unicode — NBSP (U+00A0), BOM (U+FEFF),
  // séparateur de ligne/paragraphe (U+2028/U+2029), U+3000… — alors qu'un
  // navigateur ne retire de bord d'URL que les contrôles C0 et l'espace ASCII
  // (0x00-0x20) ; ces caractères-là, il les garde et les pourcent-encode. La
  // deuxième expression ne retire donc que ce bord-là, jamais un caractère
  // qu'un navigateur conserverait.
  const cleaned = url.replace(/[\t\n\r]/g, "").replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, "");
  if (/[\x00-\x1f\x7f]/.test(cleaned)) return "/";
  if (/^\/[/\\]/.test(cleaned)) return "/";
  if (cleaned.startsWith("/") || /^https?:/i.test(cleaned)) return esc(cleaned);
  return "/";
}

export function bannerTemplateToHtml(input: BannerTemplateInput): string {
  const parts: string[] = [];

  if (input.badge_text?.trim()) {
    parts.push(`<p class="nk-banner-badge">${esc(input.badge_text.trim())}</p>`);
  }
  parts.push(`<h2 class="nk-banner-title">${esc(input.title)}</h2>`);
  if (input.subtitle?.trim()) {
    parts.push(`<p class="nk-banner-subtitle">${esc(input.subtitle.trim())}</p>`);
  }
  if (input.price != null) {
    parts.push(`<p class="nk-banner-price">${esc(formatPrice(input.price))}</p>`);
  }
  parts.push(
    `<a class="nk-cta" href="${safeHref(input.link_url)}">${esc(input.cta_text?.trim() || "Découvrir")}</a>`,
  );

  return `<div class="nk-banner">${parts.join("")}</div>`;
}
