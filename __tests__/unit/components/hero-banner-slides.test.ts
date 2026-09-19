import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("embla-carousel-react", () => ({ default: vi.fn() }));
vi.mock("embla-carousel-autoplay", () => ({ default: vi.fn() }));
vi.mock("next/image", () => ({ default: vi.fn() }));
vi.mock("next/link", () => ({ default: vi.fn() }));

import { buildSlides, buildBannerScopeClass } from "@/components/storefront/hero-banner";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import type { Banner, ProductCardData } from "@/lib/db/types";

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 1, title: "OnePlus 15", subtitle: null, badge_text: null, badge_color: "mint",
    image_url: "banners/1-a.jpg", link_url: "/p/oneplus-15", cta_text: "Découvrir",
    price: null, bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    display_order: 0, is_active: 1, starts_at: null, ends_at: null,
    content_html: null, created_at: "", updated_at: "", ...over,
  };
}

const PRODUCT = {
  id: "p1", slug: "x", name: "Produit X", base_price: 1000, compare_price: null,
  brand: "Marque", is_featured: 1, image_url: "products/p1/a.jpg",
} as unknown as ProductCardData;

describe("buildSlides", () => {
  it("porte le content_html de la bannière", () => {
    const [slide] = buildSlides([banner({ content_html: "<div>Libre</div>" })], []);
    expect(slide.content_html).toBe("<div>Libre</div>");
  });

  it("laisse content_html à null quand la bannière n'en a pas", () => {
    expect(buildSlides([banner()], [])[0].content_html).toBeNull();
  });

  it("conserve l'image et le lien comme champs structurés", () => {
    const [slide] = buildSlides([banner({ content_html: "<div>Libre</div>" })], []);
    expect(slide.image_url).toBe("banners/1-a.jpg");
    expect(slide.link_url).toBe("/p/oneplus-15");
  });

  it("retombe sur les produits en vedette sans content_html", () => {
    const slides = buildSlides([], [PRODUCT]);
    expect(slides).toHaveLength(1);
    expect(slides[0].content_html).toBeNull();
    expect(slides[0].title).toBe("Produit X");
  });

  it("ne rend aucune slide sans bannière ni produit", () => {
    expect(buildSlides([], [])).toEqual([]);
  });

  it("porte l'id de la bannière dans la slide", () => {
    const [slide] = buildSlides([banner({ id: 7 })], []);
    expect(slide.id).toBe(7);
  });

  it("met l'id à null sur le repli produits en vedette", () => {
    expect(buildSlides([], [PRODUCT])[0].id).toBeNull();
  });
});

describe("buildBannerScopeClass", () => {
  it("construit desc-banner-<id> pour une bannière", () => {
    expect(buildBannerScopeClass(7)).toBe("desc-banner-7");
  });

  it("ne pose aucune classe quand il n'y a pas de bannière (repli produits)", () => {
    expect(buildBannerScopeClass(null)).toBeUndefined();
  });

  // Lien entre les deux moitiés de la chaîne de scope : sanitizeDescriptionHtml
  // (appelé à l'écriture, cf. lib/content/conversion-plan.ts et
  // lib/db/storefront/banners.ts) préfixe les sélecteurs du <style> stocké
  // avec `.desc-banner-<id>` ; la classe posée par le composant au rendu doit
  // être exactement ce même `desc-banner-<id>` sans le point, faute de quoi le
  // CSS de l'auteur ne correspond plus à rien dans le DOM. Ce test échoue si
  // l'un des deux camps change de format sans l'autre.
  it("correspond exactement au préfixe que sanitizeDescriptionHtml écrit en base", () => {
    const id = 7;
    const html = "<style>.title{color:red}</style><h2 class=\"title\">Promo</h2>";
    const sanitized = sanitizeDescriptionHtml(html, `banner-${id}`);

    expect(sanitized).toContain(`.desc-banner-${id}`);
    expect(buildBannerScopeClass(id)).toBe(`desc-banner-${id}`);
  });
});

describe("après la conversion", () => {
  it("le repli produits en vedette garde ses champs de gabarit", () => {
    const [slide] = buildSlides([], [PRODUCT]);
    expect(slide.content_html).toBeNull();
    expect(slide.title).toBe("Produit X");
    expect(slide.cta_text).toBe("Découvrir");
  });

  it("une bannière convertie n'a plus besoin de ses champs de gabarit", () => {
    const [slide] = buildSlides(
      [banner({ content_html: "<div class='nk-banner'>Libre</div>", badge_text: null, subtitle: null })],
      [],
    );
    expect(slide.content_html).toContain("nk-banner");
  });
});

// Aucun test de comportement (au sens buildSlides) ne peut échouer si le
// rendu JSX du badge disparaît du repli — badge_text/badge_color continuent
// d'exister sur la slide que buildSlides produit, seul le rendu React qui
// les consomme serait retiré. Ce dépôt n'a pas de jsdom pour monter le
// composant, donc ce garde lit le fichier source, comme
// admin-page-guards.test.ts et product-wizard-touch-targets.test.ts :
// il verrouille contre une seconde suppression silencieuse du badge, celle
// que ce correctif corrige déjà une fois (round 2).
describe("garde source — badge du repli hero", () => {
  const source = readFileSync(
    resolve(__dirname, "../../..", "components/storefront/hero-banner.tsx"),
    "utf8",
  );

  it("garde la condition d'affichage du badge", () => {
    expect(source).toMatch(/slide\.badge_text\s*&&/);
  });

  // Distinct de la condition ci-dessus : `{slide.badge_text && (…)}` peut
  // rester intact alors que le texte affiché à l'intérieur a été remplacé
  // par autre chose (ex. un libellé en dur) — ce qui reproduirait
  // silencieusement la régression que ce correctif corrige. Ancré sur
  // `</span>` pour viser précisément l'endroit où le badge est rendu.
  it("rend toujours le texte du badge dans le <span>", () => {
    expect(source).toMatch(/\{slide\.badge_text\}\s*<\/span>/);
  });

  it("garde badgeColorMap pour colorer ce badge", () => {
    expect(source).toMatch(/badgeColorMap\[slide\.badge_color\]/);
  });
});
