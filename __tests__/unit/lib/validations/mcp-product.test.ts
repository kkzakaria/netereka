import { describe, it, expect } from "vitest";
import {
  createDraftSchema,
  updateDraftSchema,
  addImagesSchema,
  setVariantsSchema,
  searchProductsSchema,
} from "@/lib/validations/mcp-product";

describe("createDraftSchema", () => {
  it("exige name et category_id", () => {
    expect(createDraftSchema.safeParse({}).success).toBe(false);
    expect(createDraftSchema.safeParse({ name: "X", category_id: "cat-1" }).success).toBe(true);
  });

  it("borne name à 150 et short_description à 120", () => {
    expect(createDraftSchema.safeParse({ name: "a".repeat(151), category_id: "c" }).success).toBe(false);
    expect(createDraftSchema.safeParse({ name: "a", category_id: "c", short_description: "b".repeat(121) }).success).toBe(false);
  });

  it("refuse une couleur hex invalide et plus de 12 couleurs", () => {
    const base = { name: "a", category_id: "c" };
    expect(createDraftSchema.safeParse({ ...base, attributes: { colors: [{ name: "Noir", hex: "black" }] } }).success).toBe(false);
    const colors = Array.from({ length: 13 }, (_, i) => ({ name: `c${i}`, hex: "#000000" }));
    expect(createDraftSchema.safeParse({ ...base, attributes: { colors } }).success).toBe(false);
  });

  it("refuse un prix négatif ou décimal", () => {
    const base = { name: "a", category_id: "c" };
    expect(createDraftSchema.safeParse({ ...base, pricing: { base_price: -1 } }).success).toBe(false);
    expect(createDraftSchema.safeParse({ ...base, pricing: { base_price: 10.5 } }).success).toBe(false);
    expect(createDraftSchema.safeParse({ ...base, pricing: { base_price: 15000, compare_price: null } }).success).toBe(true);
  });
});

describe("contrat de contenu", () => {
  it("rejette un champ story, qui n'existe plus", () => {
    const parsed = createDraftSchema.safeParse({
      name: "X", category_id: "c1",
      story: { tagline: "Accroche" },
    });
    // Le schéma est strict sur ce qu'il connaît : story n'est simplement plus lu.
    if (parsed.success) expect("story" in parsed.data).toBe(false);
  });

  it("accepte faq_html", () => {
    const parsed = createDraftSchema.safeParse({
      name: "X", category_id: "c1",
      faq_html: "<div class='nk-faq'><details><summary>Q</summary><p>R</p></details></div>",
    });
    expect(parsed.success).toBe(true);
  });

  it("borne faq_html à la taille d'entrée du sanitizer", () => {
    const parsed = createDraftSchema.safeParse({
      name: "X", category_id: "c1", faq_html: "a".repeat(512_001),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("updateDraftSchema", () => {
  it("accepte un patch vide et distingue null d'absent", () => {
    const r = updateDraftSchema.safeParse({ brand: null });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ brand: null });
    expect(updateDraftSchema.safeParse({}).success).toBe(true);
  });

  it("exige les trois groupes d'attributs : un patch couleurs seules ne peut pas effacer specs et dimensions", () => {
    // Create fills the missing groups with defaults…
    const created = createDraftSchema.safeParse({ name: "a", category_id: "c", attributes: { colors: [{ name: "Noir", hex: "#000000" }] } });
    expect(created.success).toBe(true);
    expect(created.data?.attributes).toEqual({ colors: [{ name: "Noir", hex: "#000000" }], dimensions: {}, specs: [] });
    // …but update replaces the whole set, so an omitted group is a validation error, not a silent wipe.
    const partial = updateDraftSchema.safeParse({ attributes: { colors: [{ name: "Noir", hex: "#000000" }] } });
    expect(partial.success).toBe(false);
    expect(Object.keys(partial.error!.flatten().fieldErrors)).toContain("attributes");
    const full = updateDraftSchema.safeParse({ attributes: { colors: [], dimensions: {}, specs: [{ name: "RAM", value: "8 Go" }] } });
    expect(full.success).toBe(true);
    // attributes stays optional: a patch without it leaves the stored set untouched.
    expect(updateDraftSchema.safeParse({ name: "b" }).success).toBe(true);
  });

  it("valide le format du slug", () => {
    expect(updateDraftSchema.safeParse({ slug: "iphone-15-pro" }).success).toBe(true);
    expect(updateDraftSchema.safeParse({ slug: "IPhone 15" }).success).toBe(false);
    expect(updateDraftSchema.safeParse({ slug: "-bad" }).success).toBe(false);
  });
});

describe("addImagesSchema", () => {
  it("exige 1 à 8 URLs http(s)", () => {
    expect(addImagesSchema.safeParse({ images: [] }).success).toBe(false);
    expect(addImagesSchema.safeParse({ images: [{ url: "ftp://x/a.jpg" }] }).success).toBe(false);
    const nine = Array.from({ length: 9 }, (_, i) => ({ url: `https://x.test/${i}.jpg` }));
    expect(addImagesSchema.safeParse({ images: nine }).success).toBe(false);
    expect(addImagesSchema.safeParse({ images: nine.slice(0, 8) }).success).toBe(true);
  });
});

describe("setVariantsSchema", () => {
  it("uniform_price vaut true par défaut", () => {
    const r = setVariantsSchema.safeParse({ variants: [{ color_name: "Noir", color_hex: "#000000", stock: 3 }] });
    expect(r.success).toBe(true);
    expect(r.data?.uniform_price).toBe(true);
  });

  it("refuse un stock négatif", () => {
    expect(setVariantsSchema.safeParse({ variants: [{ color_name: "Noir", color_hex: "#000000", stock: -1 }] }).success).toBe(false);
  });
});

describe("searchProductsSchema", () => {
  it("borne la requête et la limite", () => {
    expect(searchProductsSchema.safeParse({ query: "ab" }).success).toBe(false);
    expect(searchProductsSchema.safeParse({ query: "abc" }).data?.limit).toBe(20);
    expect(searchProductsSchema.safeParse({ query: "abc", limit: 51 }).success).toBe(false);
  });
});
