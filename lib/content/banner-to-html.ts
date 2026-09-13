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
  // Un navigateur retire les caractères de contrôle C0 avant d'analyser une URL,
  // donc un filtre qui juge la chaîne brute lit un autre document que celui qui
  // s'exécutera : "/\t/evil.example" passe pour un chemin relatif et se résout en
  // "https://evil.example". On normalise avant de décider — et on émet la forme
  // normalisée, puisqu'un caractère de contrôle n'a rien à faire dans un lien de
  // bannière. Même doctrine que isSafeUri dans lib/utils/sanitize-html.ts.
  const cleaned = url.replace(/[\x00-\x20\x7f]/g, "");
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
