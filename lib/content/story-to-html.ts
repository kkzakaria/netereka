import type { ProductHighlight, ProductFeatureBlock, ProductFaqItem } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";
import { iconToSvg } from "@/lib/content/icon-to-svg";

/**
 * Convertit une story produit structurée en un document de contenu libre.
 *
 * L'ordre d'agrégation reproduit exactement l'ordre de rendu de
 * components/storefront/product-story/index.tsx avant sa réduction : tagline,
 * highlights, blocs, puis le contenu libre qui existait déjà. La FAQ n'est PAS
 * de la partie — elle a désormais son propre onglet et sa propre colonne, et
 * passe par faqToHtml.
 *
 * Le markup emploie le vocabulaire `nk-` (§ 2.1 du spec), pas un balisage ad
 * hoc : cette conversion est le premier corpus de contenu libre du site, et
 * c'est ce qui la rend conforme à la charte dès le premier jour. Le test
 * story-to-html.test.ts vérifie cette conformité en appelant
 * checkDesignConformance sur sa propre sortie.
 *
 * Les blocs à image alternent image/texte d'un bloc à l'autre (zig-zag) pour
 * reproduire la disposition de story-feature-block.tsx. Ce comportement inverse
 * l'ordre DOM pour les blocs de rang impair : le résultat visuel corresponds
 * mais l'ordre de lecture aux lecteurs d'écran est inversé pour ces blocs
 * (conséquence acceptable du vocabulaire `nk-` sans crochet `order` CSS).
 */

export interface StoryInput {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  feature_blocks: ProductFeatureBlock[] | null;
  /** Description déjà stockée, telle quelle. Placée en fin de document. */
  description_html: string | null;
}

export interface StoryConversion {
  html: string;
  unresolvedIcons: string[];
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Le corps d'un bloc et la réponse d'une FAQ acceptent des sauts de ligne —
 *  l'éditeur structuré les rendait via `whitespace-pre-line`. En HTML libre,
 *  chaque ligne devient son propre paragraphe. */
function paragraphs(text: string): string {
  return text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");
}

function taglineSection(tagline: string): string {
  return `<section class="nk-section"><div class="nk-container"><p class="nk-lead">${esc(tagline)}</p></div></section>`;
}

function highlightsSection(
  highlights: ProductHighlight[],
  unresolved: string[],
): string {
  const items = highlights
    .map((h) => {
      const svg = iconToSvg(h.icon, "nk-highlight-icon");
      if (!svg) unresolved.push(h.icon);
      return `<li class="nk-card">${svg ?? ""}<p>${esc(h.label)}</p></li>`;
    })
    .join("");
  return `<section class="nk-section nk-section-alt"><ul class="nk-grid">${items}</ul></section>`;
}

function featureBlockSection(block: ProductFeatureBlock, index: number): string {
  const heading = `<h3>${esc(block.title)}</h3>`;
  const body = paragraphs(block.body);

  if (!block.image_url) {
    return `<section class="nk-section"><div class="nk-container">${heading}${body}</div></section>`;
  }

  const img = `<img class="nk-media" src="${esc(getImageUrl(block.image_url))}" alt="${esc(block.image_alt || block.title)}" loading="lazy">`;
  const text = `<div>${heading}${body}</div>`;
  // Zig-zag : les blocs de rang impair inversent image et texte, comme le
  // faisait story-feature-block.tsx.
  const inner = index % 2 === 1 ? `${text}${img}` : `${img}${text}`;
  return `<section class="nk-section"><div class="nk-split">${inner}</div></section>`;
}

export function storyToHtml(input: StoryInput): StoryConversion {
  const unresolvedIcons: string[] = [];
  const parts: string[] = [];

  if (input.tagline && input.tagline.trim()) {
    parts.push(taglineSection(input.tagline.trim()));
  }
  if (input.highlights && input.highlights.length > 0) {
    parts.push(highlightsSection(input.highlights, unresolvedIcons));
  }
  if (input.feature_blocks && input.feature_blocks.length > 0) {
    input.feature_blocks.forEach((b, i) => parts.push(featureBlockSection(b, i)));
  }
  if (input.description_html && input.description_html.trim()) {
    // Enveloppé dans une nk-section/nk-container plutôt qu'ajouté tel quel :
    // sans ça, ce contenu — souvent plusieurs paragraphes de prose déjà
    // rédigée — se retrouve enfant direct de .nk-prose, en pleine largeur
    // (jusqu'à ~1248px, le wrapper max-w-7xl de la page produit), au lieu de
    // la mesure de lecture confortable que nk-container impose. C'est
    // exactement le défaut mesuré sur 751 des 766 descriptions déjà
    // converties en production — corrigé pour CELLES-LÀ par la règle CSS
    // `:where(.nk-prose) > p, …` (app/globals.css), qui ne peut pas être
    // rejouée sur ces lignes déjà écrites en base. Ce script-ci ne
    // re-convertit jamais un produit déjà traité (planProduct l'exclut), donc
    // ce correctif ne s'applique qu'aux conversions futures.
    parts.push(
      `<section class="nk-section"><div class="nk-container">${input.description_html.trim()}</div></section>`,
    );
  }

  return { html: parts.join(""), unresolvedIcons };
}

export function faqToHtml(faq: ProductFaqItem[] | null): string {
  if (!faq || faq.length === 0) return "";
  const items = faq
    .map((item) => `<details><summary>${esc(item.question)}</summary>${paragraphs(item.answer)}</details>`)
    .join("");
  return `<section class="nk-section"><div class="nk-container"><div class="nk-faq">${items}</div></div></section>`;
}
