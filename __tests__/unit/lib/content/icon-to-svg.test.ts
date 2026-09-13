import { describe, it, expect } from "vitest";
import { iconToSvg } from "@/lib/content/icon-to-svg";

describe("iconToSvg", () => {
  it("produit un SVG pour une icône connue", () => {
    const svg = iconToSvg("battery");
    expect(svg).not.toBeNull();
    expect(svg!.startsWith("<svg ")).toBe(true);
    expect(svg!.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain("<path ");
  });

  it("convertit les attributs camelCase de React en attributs SVG", () => {
    const svg = iconToSvg("battery")!;
    expect(svg).toContain("stroke-width=");
    expect(svg).toContain("stroke-linecap=");
    expect(svg).not.toContain("strokeWidth");
    expect(svg).not.toContain("strokeLinecap");
  });

  it("ne laisse jamais passer la clé React", () => {
    expect(iconToSvg("battery")!).not.toContain("key=");
  });

  it("applique la classe demandée", () => {
    expect(iconToSvg("camera", "nk-icon")!).toContain('class="nk-icon"');
  });

  it("retourne null sur un nom inconnu", () => {
    expect(iconToSvg("licorne")).toBeNull();
    expect(iconToSvg("")).toBeNull();
  });

  it("échappe les guillemets dans une valeur d'attribut", () => {
    // Aucune icône Hugeicons n'en contient, mais la sérialisation ne doit pas
    // pouvoir produire un attribut cassé si le paquet change.
    expect(iconToSvg("battery", 'a"b')!).toContain('class="a&quot;b"');
  });

  it("produit un SVG conforme à la charte", async () => {
    const { checkDesignConformance } = await import("@/lib/content/check-design-conformance");
    expect(checkDesignConformance(iconToSvg("battery")!)).toEqual([]);
  });

  it("chaque icône traverse l'assainissement sans perdre un nœud", async () => {
    const { sanitizeDescriptionHtml } = await import("@/lib/utils/sanitize-html");
    const { HIGHLIGHT_ICON_MAP } = await import("@/components/storefront/product-story/icons");
    for (const name of Object.keys(HIGHLIGHT_ICON_MAP)) {
      const svg = iconToSvg(name)!;
      // Le sanitizer met les noms d'attributs en minuscules : viewBox ressort
      // viewbox, ce que l'analyseur HTML remappe. C'est la seule différence tolérée.
      const expected = svg.replace(/viewBox=/g, "viewbox=");
      expect(sanitizeDescriptionHtml(svg), `icône ${name}`).toBe(expected);
    }
  });

  it("conserve le cercle de l'icône compass, l'une des cinq icônes à porter un node circle", async () => {
    const { sanitizeDescriptionHtml } = await import("@/lib/utils/sanitize-html");
    const svg = iconToSvg("compass")!;
    expect(sanitizeDescriptionHtml(svg)).toContain("<circle");
  });

  it("ferme explicitement chaque nœud, faute de quoi ils s'imbriqueraient", () => {
    const svg = iconToSvg("battery")!;
    expect(svg).not.toContain("/>");
    expect(svg).toContain("></path>");
  });
});
