import { describe, it, expect } from "vitest";
import { storyToHtml, faqToHtml } from "@/lib/content/story-to-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

const EMPTY = { tagline: null, highlights: null, feature_blocks: null, description_html: null };

describe("storyToHtml", () => {
  it("retourne une chaîne vide quand il n'y a rien", () => {
    expect(storyToHtml(EMPTY)).toEqual({ html: "", unresolvedIcons: [] });
  });

  it("rend la tagline dans une section", () => {
    const { html } = storyToHtml({ ...EMPTY, tagline: "Trois jours d'autonomie." });
    expect(html).toContain('class="nk-section"');
    expect(html).toContain("Trois jours d'autonomie.");
  });

  it("échappe le HTML présent dans un champ texte", () => {
    const { html } = storyToHtml({ ...EMPTY, tagline: "5 < 10 & <script>x</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("rend les highlights en grille avec leur icône en SVG", () => {
    const { html, unresolvedIcons } = storyToHtml({
      ...EMPTY,
      highlights: [
        { icon: "battery", label: "7300 mAh" },
        { icon: "camera", label: "50 MP" },
      ],
    });
    expect(html).toContain('class="nk-grid"');
    expect(html).toContain("<svg ");
    expect(html).toContain("7300 mAh");
    expect(unresolvedIcons).toEqual([]);
  });

  it("omet une icône inconnue sans échouer et la signale", () => {
    const { html, unresolvedIcons } = storyToHtml({
      ...EMPTY,
      highlights: [{ icon: "licorne", label: "Magique" }],
    });
    expect(html).toContain("Magique");
    expect(html).not.toContain("<svg ");
    expect(unresolvedIcons).toEqual(["licorne"]);
  });

  it("rend un bloc sans image en pleine largeur lisible", () => {
    const { html } = storyToHtml({
      ...EMPTY,
      feature_blocks: [{ title: "Écran", body: "AMOLED 120 Hz" }],
    });
    expect(html).toContain('class="nk-container"');
    expect(html).toContain("<h3>Écran</h3>");
    expect(html).toContain("AMOLED 120 Hz");
  });

  it("rend un bloc avec image en deux colonnes", () => {
    const { html } = storyToHtml({
      ...EMPTY,
      feature_blocks: [
        { title: "Photo", body: "Capteur 1 pouce", image_url: "products/p1/a.jpg", image_alt: "Module photo" },
      ],
    });
    expect(html).toContain('class="nk-split"');
    expect(html).toContain('class="nk-media"');
    expect(html).toContain('alt="Module photo"');
  });

  it("retombe sur le titre quand image_alt manque", () => {
    const { html } = storyToHtml({
      ...EMPTY,
      feature_blocks: [{ title: "Photo", body: "x", image_url: "products/p1/a.jpg" }],
    });
    expect(html).toContain('alt="Photo"');
  });

  it("place la description existante en dernier, sans la modifier", () => {
    const existing = '<section class="nk-section"><p>Déjà écrit</p></section>';
    const { html } = storyToHtml({ ...EMPTY, tagline: "Accroche", description_html: existing });
    expect(html.indexOf("Accroche")).toBeLessThan(html.indexOf("Déjà écrit"));
    expect(html).toContain(existing);
  });

  it("produit un document conforme à la charte", () => {
    const { html } = storyToHtml({
      tagline: "Accroche",
      highlights: [{ icon: "battery", label: "7300 mAh" }],
      feature_blocks: [{ title: "Photo", body: "x", image_url: "products/p1/a.jpg", image_alt: "Module" }],
      description_html: null,
    });
    expect(checkDesignConformance(html)).toEqual([]);
  });

  it("survit à l'assainissement, qui est ce que la conversion lui fera subir", async () => {
    const { sanitizeDescriptionHtml } = await import("@/lib/utils/sanitize-html");
    const { html } = storyToHtml({
      tagline: "Accroche",
      highlights: [{ icon: "battery", label: "7300 mAh" }, { icon: "compass", label: "GPS" }],
      feature_blocks: [
        { title: "Écran", body: "AMOLED" },
        { title: "Photo", body: "x", image_url: "products/p1/a.jpg", image_alt: "Module" },
      ],
      description_html: null,
    });
    // Égalité stricte : un toContain ne verrait pas une balise retirée au milieu.
    // Compte pour la normalisation de viewBox → viewbox (comportement du sanitizer).
    const sanitized = sanitizeDescriptionHtml(html, "prod-1");
    const normalized = html.replace(/\bviewBox\b/g, "viewbox");
    expect(sanitized).toBe(normalized);
  });
});

describe("faqToHtml", () => {
  it("retourne une chaîne vide pour null ou une liste vide", () => {
    expect(faqToHtml(null)).toBe("");
    expect(faqToHtml([])).toBe("");
  });

  it("produit un accordéon details/summary", () => {
    const html = faqToHtml([{ question: "Livraison ?", answer: "48h à Abidjan." }]);
    expect(html).toContain('class="nk-faq"');
    expect(html).toContain("<details>");
    expect(html).toContain("<summary>Livraison ?</summary>");
    expect(html).toContain("48h à Abidjan.");
  });

  it("échappe le contenu des questions et des réponses", () => {
    const html = faqToHtml([{ question: "<b>Q</b>", answer: "<script>x</script>" }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Q&lt;/b&gt;");
  });

  it("produit un document conforme à la charte", () => {
    const html = faqToHtml([{ question: "Q", answer: "R" }]);
    expect(checkDesignConformance(html)).toEqual([]);
  });

  it("la FAQ survit elle aussi à l'assainissement", async () => {
    const { sanitizeDescriptionHtml } = await import("@/lib/utils/sanitize-html");
    const faq = faqToHtml([{ question: "Garantie ?", answer: "12 mois." }]);
    expect(sanitizeDescriptionHtml(faq, "prod-1")).toBe(faq);
  });
});
