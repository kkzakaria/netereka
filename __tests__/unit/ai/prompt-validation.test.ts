import { describe, expect, it } from "vitest";
import { aiPromptSchema, aiProductOutputSchema, aiNotFoundSchema, parseAiToolInput } from "@/lib/validations/product-ai";

describe("aiPromptSchema", () => {
  it("accepte un prompt normal", () => {
    expect(aiPromptSchema.safeParse("Samsung Galaxy A55").success).toBe(true);
  });

  it("trim les espaces", () => {
    const r = aiPromptSchema.safeParse("  iPhone 15 Pro  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("iPhone 15 Pro");
  });

  it("rejette trop court (< 3 chars après trim)", () => {
    expect(aiPromptSchema.safeParse("  a ").success).toBe(false);
  });

  it("rejette trop long (> 200 chars)", () => {
    expect(aiPromptSchema.safeParse("x".repeat(201)).success).toBe(false);
  });

  it("rejette les caractères de contrôle", () => {
    expect(aiPromptSchema.safeParse("Galaxy\x00A55").success).toBe(false);
    expect(aiPromptSchema.safeParse("Galaxy\nA55").success).toBe(false);
  });
});

describe("aiProductOutputSchema", () => {
  const valid = {
    name: "Samsung Galaxy A55",
    brand: "Samsung",
    category_suggestion: "smartphones",
    short_description: "Smartphone 128Go",
    description_html: "<p>Super téléphone.</p>",
    attributes: {
      colors: [{ name: "Noir", hex: "#1a1a1a" }],
      dimensions: { length_mm: 161, height_mm: 77, width_mm: 8, weight_g: 213 },
      specs: [{ name: "Écran", value: "6.6\" AMOLED 120Hz" }],
    },
    story: {
      tagline: "Le nouveau standard du milieu de gamme",
      highlights: [
        { icon: "camera", label: "Triple capteur 50MP" },
        { icon: "battery", label: "Autonomie 2 jours" },
        { icon: "display", label: "Écran 120Hz" },
      ],
      feature_blocks: [
        { title: "Un écran qui impressionne", body: "AMOLED 120Hz, 6.6 pouces." },
        { title: "Une autonomie tenace", body: "Batterie 5000 mAh, charge rapide 25W." },
      ],
      faq: [
        { question: "Est-il compatible 5G ?", answer: "Oui, pleinement compatible." },
      ],
    },
    seo: {
      meta_title: "Samsung Galaxy A55 5G 128Go | Netereka",
      meta_description: "Achetez le Galaxy A55 5G 128Go avec livraison à domicile.",
    },
    image_candidates: [
      { url: "https://images.samsung.com/a.jpg", source_domain: "samsung.com", alt: "Face avant" },
    ],
  };

  it("accepte une sortie complète valide", () => {
    expect(aiProductOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un hex invalide", () => {
    const bad = { ...valid, attributes: { ...valid.attributes, colors: [{ name: "Noir", hex: "black" }] } };
    expect(aiProductOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette une URL d'image invalide", () => {
    const bad = { ...valid, image_candidates: [{ url: "not-a-url", source_domain: "x", alt: "" }] };
    expect(aiProductOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette un icône de highlight hors liste curée", () => {
    const bad = {
      ...valid,
      story: { ...valid.story, highlights: [
        { icon: "invalid-icon", label: "x" },
        { icon: "camera", label: "y" },
        { icon: "battery", label: "z" },
      ] },
    };
    expect(aiProductOutputSchema.safeParse(bad).success).toBe(false);
  });
});

describe("parseAiToolInput", () => {
  it("retourne une erreur when not_found flag true", () => {
    const r = parseAiToolInput({ not_found: true, reason: "Produit inconnu" });
    expect(r.kind).toBe("not_found");
  });

  it("retourne ok pour une sortie complète", () => {
    const out = {
      name: "X", category_suggestion: "y",
      attributes: { colors: [], dimensions: {}, specs: [] },
      story: {},
      seo: {},
      image_candidates: [{ url: "https://x.test/a.jpg", source_domain: "x.test" }],
    };
    const r = parseAiToolInput(out);
    expect(r.kind).toBe("ok");
  });

  it("retourne invalid pour un payload cassé", () => {
    const r = parseAiToolInput({ oops: true });
    expect(r.kind).toBe("invalid");
  });
});
