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
  // Retire d'abord les balises HTML — ce qui garantit que les attributs
  // malveillants (onerror, onclick…) sont complètement supprimés, pas juste échappés.
  // Puis échappe les caractères spéciaux du HTML.
  const stripped = text.replace(/<[^>]*>/g, "");
  return stripped
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    `<a class="nk-cta" href="${esc(input.link_url)}">${esc(input.cta_text?.trim() || "Découvrir")}</a>`,
  );

  return `<div class="nk-banner">${parts.join("")}</div>`;
}
