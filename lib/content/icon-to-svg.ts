import { HIGHLIGHT_ICON_MAP } from "@/components/storefront/product-story/icons";

/**
 * Sérialise une icône Hugeicons en SVG inline.
 *
 * Les icônes du paquet sont des données, pas des composants : un tableau de
 * paires [balise, attributs] où les attributs suivent la convention React
 * (camelCase, plus une clé `key`). Le navigateur, lui, attend du kebab-case et
 * ne connaît pas `key`.
 *
 * Ce module existe pour la conversion de l'existant (§ 3.1 du spec) : les
 * highlights d'une story portaient une icône rendue par React, et le contenu
 * libre qui les remplace ne peut porter que du SVG. Il est le dernier
 * consommateur de HIGHLIGHT_ICON_MAP, supprimé juste après.
 */

/** Le paquet dessine toutes ses icônes dans une grille 24×24. */
const VIEW_BOX = "0 0 24 24";

type IconNode = [string, Record<string, string | number>];

function toKebab(attr: string): string {
  return attr.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Balise fermante explicite : `sanitizeDescriptionHtml` retire la barre
 * auto-fermante (`<br/>` en ressort `<br>`, `<hr />` en ressort `<hr>`), sans
 * effet sur les éléments vides de HTML mais catastrophique ici — un
 * `<path … />` ressortirait `<path>` resté ouvert, et les `path` suivants
 * s'imbriqueraient dedans au lieu d'être frères. On n'attend rien de
 * l'indulgence des navigateurs : on émet nous-mêmes la paire ouvrante/fermante.
 */
function serializeNode([tag, attrs]: IconNode): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(attrs)) {
    // `key` est une instruction de réconciliation React, pas un attribut SVG.
    if (name === "key") continue;
    parts.push(`${toKebab(name)}="${escapeAttr(String(value))}"`);
  }
  return `<${tag}${parts.length ? ` ${parts.join(" ")}` : ""}></${tag}>`;
}

export function iconToSvg(name: string, className?: string): string | null {
  if (!name || !Object.hasOwn(HIGHLIGHT_ICON_MAP, name)) return null;
  const nodes = HIGHLIGHT_ICON_MAP[name as keyof typeof HIGHLIGHT_ICON_MAP] as unknown as IconNode[];
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  const attrs = [
    `xmlns="http://www.w3.org/2000/svg"`,
    `viewBox="${VIEW_BOX}"`,
    `width="24"`,
    `height="24"`,
    `fill="none"`,
    // currentColor : l'icône prend la couleur du texte, donc celle du token
    // en vigueur, et suit le thème sombre sans règle supplémentaire.
    `stroke="currentColor"`,
    `aria-hidden="true"`,
  ];
  if (className) attrs.push(`class="${escapeAttr(className)}"`);

  return `<svg ${attrs.join(" ")}>${nodes.map(serializeNode).join("")}</svg>`;
}
