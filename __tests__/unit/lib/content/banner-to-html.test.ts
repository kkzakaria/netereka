import { describe, it, expect } from "vitest";
import { bannerTemplateToHtml } from "@/lib/content/banner-to-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

const BASE = {
  title: "OnePlus 15",
  subtitle: null,
  badge_text: null,
  price: null,
  cta_text: null,
  link_url: "/p/oneplus-15",
};

describe("bannerTemplateToHtml", () => {
  it("rend toujours le titre", () => {
    expect(bannerTemplateToHtml(BASE)).toContain("OnePlus 15");
  });

  it("omet les champs vides", () => {
    const html = bannerTemplateToHtml(BASE);
    expect(html).not.toContain("nk-badge");
    expect(html).not.toContain("XOF");
  });

  it("rend le badge, le sous-titre et le prix quand ils existent", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      badge_text: "Nouveauté",
      subtitle: "Snapdragon 8 Elite",
      price: 450000,
    });
    expect(html).toContain("Nouveauté");
    expect(html).toContain("Snapdragon 8 Elite");
    expect(html).toContain("450");
  });

  it("rend le bouton vers le lien, avec Découvrir par défaut", () => {
    const html = bannerTemplateToHtml(BASE);
    expect(html).toContain('href="/p/oneplus-15"');
    expect(html).toContain("Découvrir");
    expect(html).toContain("nk-cta");
  });

  it("respecte un libellé de bouton personnalisé", () => {
    expect(bannerTemplateToHtml({ ...BASE, cta_text: "Commander" })).toContain("Commander");
  });

  it("échappe le HTML des champs texte", () => {
    expect(bannerTemplateToHtml({ ...BASE, title: '<img src=x onerror="alert(1)">' }))
      .not.toContain("onerror");
  });

  it("produit un document conforme à la charte", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      badge_text: "Promo",
      subtitle: "Sous-titre",
      price: 199000,
      cta_text: "Voir",
    });
    expect(checkDesignConformance(html)).toEqual([]);
  });

  it("survit à l'assainissement, qui est ce que la conversion lui fera subir", async () => {
    const { sanitizeDescriptionHtml } = await import("@/lib/utils/sanitize-html");
    const html = bannerTemplateToHtml({
      title: "OnePlus 15",
      subtitle: "Snapdragon 8 Elite",
      badge_text: "Nouveauté",
      price: 450000,
      cta_text: "Commander",
      link_url: "/p/oneplus-15",
    });
    // Égalité stricte : un toContain ne verrait pas une balise retirée au milieu.
    expect(sanitizeDescriptionHtml(html, "banner-7")).toBe(html);
  });
});
