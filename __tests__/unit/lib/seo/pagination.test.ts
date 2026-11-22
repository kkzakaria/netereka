import { describe, it, expect } from "vitest";
import {
  categoryCanonical,
  isCrawlableListing,
  listingPageHref,
  normalizeListingParams,
  parsePage,
} from "@/lib/seo/pagination";

describe("normalizeListingParams", () => {
  it("garde la première valeur d'une clé répétée", () => {
    expect(normalizeListingParams({ brand: ["apple", "samsung"], page: ["2", "3"] })).toEqual({
      brand: "apple",
      page: "2",
    });
  });

  it("ignore les clés inconnues et les valeurs vides", () => {
    expect(normalizeListingParams({ utm_source: "fb", brand: "", sort: "price_asc" })).toEqual({
      sort: "price_asc",
    });
  });
});

describe("isCrawlableListing", () => {
  it("liste nue ou simplement paginée → liens suivables", () => {
    expect(isCrawlableListing({})).toBe(true);
    expect(isCrawlableListing({ page: "3" })).toBe(true);
  });

  it.each([{ brand: "apple" }, { min_price: "1000" }, { sort: "price_asc" }])(
    "filtrée ou triée (%o) → pas de liens à explorer",
    (params) => {
      expect(isCrawlableListing(params)).toBe(false);
    },
  );
});

describe("parsePage", () => {
  it.each([
    [undefined, 1],
    ["1", 1],
    ["3", 3],
    ["0", 1],
    ["-2", 1],
    ["abc", 1],
  ])("%s → %i", (raw, expected) => {
    expect(parsePage(raw)).toBe(expected);
  });
});

describe("categoryCanonical", () => {
  it("page 1 → la catégorie nue", () => {
    expect(categoryCanonical("smartphones", {})).toBe("/c/smartphones");
    expect(categoryCanonical("smartphones", { page: "1" })).toBe("/c/smartphones");
  });

  it("page N > 1 → elle-même, pas la page 1 (sinon Google ignore son contenu)", () => {
    expect(categoryCanonical("smartphones", { page: "2" })).toBe("/c/smartphones?page=2");
  });

  it("une page filtrée, même paginée, renvoie à la catégorie nue", () => {
    expect(categoryCanonical("smartphones", { brand: "apple", page: "2" })).toBe("/c/smartphones");
    expect(categoryCanonical("smartphones", { min_price: "1000" })).toBe("/c/smartphones");
  });

  it("le tri seul ne change pas le canonical de la page", () => {
    expect(categoryCanonical("smartphones", { sort: "price_asc", page: "2" })).toBe(
      "/c/smartphones?page=2",
    );
  });
});

describe("listingPageHref", () => {
  it("la page 1 n'a pas de ?page=", () => {
    expect(listingPageHref("/c/tv", {}, 1)).toBe("/c/tv");
  });

  it("conserve filtres et tri, remplace la page", () => {
    expect(
      listingPageHref("/c/tv", { brand: "samsung", sort: "price_asc", page: "2" }, 3),
    ).toBe("/c/tv?brand=samsung&sort=price_asc&page=3");
  });

  it("ignore tout paramètre inconnu", () => {
    const params = { page: "1", utm_source: "x" } as Parameters<typeof listingPageHref>[1];
    expect(listingPageHref("/c/tv", params, 2)).toBe("/c/tv?page=2");
  });
});
