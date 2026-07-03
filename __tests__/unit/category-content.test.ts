import { describe, it, expect } from "vitest";
import {
  CATEGORY_SEO_CONTENT,
  getCategorySeoContent,
} from "@/lib/seo/category-content";

const PROD_SLUGS = [
  "smartphones",
  "ordinateurs",
  "tablettes",
  "montres-connectees",
  "ecouteurs",
  "accessoires",
  "jeux",
  "televiseurs",
  "projecteurs",
  "imprimantes",
  "reseau",
  "apple",
  "samsung",
  "xiaomi",
  "redmi",
  "oppo",
  "oneplus",
  "huawei",
  "nothing",
  "quasi-neuf",
];

describe("CATEGORY_SEO_CONTENT", () => {
  it("couvre toutes les catégories de production", () => {
    for (const slug of PROD_SLUGS) {
      expect(CATEGORY_SEO_CONTENT[slug], `contenu manquant: ${slug}`).toBeDefined();
    }
  });

  it("meta descriptions entre 100 et 160 caractères", () => {
    for (const [slug, c] of Object.entries(CATEGORY_SEO_CONTENT)) {
      expect(
        c.metaDescription.length,
        `${slug}: ${c.metaDescription.length}`
      ).toBeGreaterThanOrEqual(100);
      expect(
        c.metaDescription.length,
        `${slug}: ${c.metaDescription.length}`
      ).toBeLessThanOrEqual(160);
    }
  });

  it("meta descriptions uniques (pas de duplicate content)", () => {
    const descs = Object.values(CATEGORY_SEO_CONTENT).map((c) => c.metaDescription);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("chaque entrée a un heading et au moins 1 paragraphe substantiel", () => {
    for (const [slug, c] of Object.entries(CATEGORY_SEO_CONTENT)) {
      expect(c.heading.length, slug).toBeGreaterThan(10);
      expect(c.paragraphs.length, slug).toBeGreaterThanOrEqual(1);
      const total = c.paragraphs.join(" ").length;
      expect(total, `${slug}: texte trop court (${total})`).toBeGreaterThanOrEqual(300);
    }
  });

  it("getCategorySeoContent retourne null pour un slug inconnu", () => {
    expect(getCategorySeoContent("inexistant")).toBeNull();
    expect(getCategorySeoContent("smartphones")).not.toBeNull();
  });
});
