import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Métadonnées SEO d'une page catégorie : canonical de la pagination, titre,
 * image de partage, et pages au-delà de la fin. C'est ici que le canonical
 * avait été pointé vers la page 1 pour toutes les pages, sans qu'aucun test
 * ne le voie.
 */
const mocks = vi.hoisted(() => ({
  getCategoryBySlug: vi.fn(),
  getCategoryDescendantIds: vi.fn(),
  countSearchResults: vi.fn(),
}));

vi.mock("@/lib/db/categories", () => ({
  getCategoryBySlug: mocks.getCategoryBySlug,
  getCategoryDescendantIds: mocks.getCategoryDescendantIds,
  getCategoryAncestors: vi.fn(),
  getCategoryChildren: vi.fn(),
  getTopLevelCategories: vi.fn(),
}));
vi.mock("@/lib/db/search", () => ({
  searchProducts: vi.fn(),
  countSearchResults: mocks.countSearchResults,
  getBrandsInCategory: vi.fn(),
  getPriceRangeInCategory: vi.fn(),
}));
// Client components the page imports; irrelevant to metadata.
vi.mock("@/app/(storefront)/search/filter-context", () => ({ FilterProvider: "FilterProvider" }));
vi.mock("@/app/(storefront)/search/search-filters", () => ({ SearchFilters: "SearchFilters" }));
vi.mock("@/app/(storefront)/search/search-sort", () => ({ SearchSort: "SearchSort" }));
vi.mock("@/app/(storefront)/search/active-filters", () => ({ ActiveFilters: "ActiveFilters" }));
vi.mock("@/app/(storefront)/search/mobile-filter-sheet", () => ({ MobileFilterSheet: "MobileFilterSheet" }));
vi.mock("@/components/storefront/product-list-with-more", () => ({ ProductListWithMore: "ProductListWithMore" }));

import { generateMetadata } from "@/app/(storefront)/c/[slug]/page";

const CATEGORY = {
  id: "cat-1",
  name: "Smartphones",
  slug: "smartphones",
  description: null,
  image_url: null,
  parent_id: null,
  sort_order: 0,
  is_active: 1,
  created_at: "",
};

function meta(searchParams: Record<string, string | string[]> = {}, slug = "smartphones") {
  return generateMetadata({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(searchParams),
  });
}

beforeEach(() => {
  mocks.getCategoryBySlug.mockReset().mockResolvedValue(CATEGORY);
  mocks.getCategoryDescendantIds.mockReset().mockResolvedValue([]);
  mocks.countSearchResults.mockReset().mockResolvedValue(84); // 5 pages de 20
});

describe("generateMetadata — catégorie", () => {
  it("page 1 : canonical nu, pas de suffixe, image de partage présente", async () => {
    const m = await meta();
    expect(m.alternates?.canonical).toBe("/c/smartphones");
    expect(String(m.title)).not.toMatch(/Page/);
    expect(m.openGraph?.images).toEqual(["/og-image.jpg"]);
    expect(m.robots).toBeUndefined();
  });

  it("page 2 : canonical sur elle-même et titre « Page 2 »", async () => {
    const m = await meta({ page: "2" });
    expect(m.alternates?.canonical).toBe("/c/smartphones?page=2");
    expect(String(m.title)).toMatch(/Page 2$/);
    expect(String(m.openGraph?.url)).toMatch(/\/c\/smartphones\?page=2$/);
  });

  it("au-delà de la fin : noindex, sans canonical ni titre « Page N »", async () => {
    const m = await meta({ page: "6" }); // (6-1)*20 = 100 ≥ 84
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.alternates).toBeUndefined();
    expect(m.title).toBeUndefined();
  });

  it("dernière page réelle : indexable", async () => {
    const m = await meta({ page: "5" }); // produits 81-84
    expect(m.alternates?.canonical).toBe("/c/smartphones?page=5");
  });

  it("filtrée : canonical vers la catégorie nue", async () => {
    const m = await meta({ brand: "apple", page: "2" });
    expect(m.alternates?.canonical).toBe("/c/smartphones");
  });

  it("clé répétée (string[]) : pas d'erreur, première valeur retenue", async () => {
    const m = await meta({ page: ["2", "3"], brand: ["apple", "samsung"] });
    expect(m.alternates?.canonical).toBe("/c/smartphones");
    expect(mocks.countSearchResults).toHaveBeenCalledWith(
      expect.objectContaining({ brands: ["apple"] }),
    );
  });

  it("triée : noindex, follow", async () => {
    const m = await meta({ sort: "price_asc" });
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it("catégorie inexistante : rien (Next ajoute lui-même le noindex de la 404)", async () => {
    mocks.getCategoryBySlug.mockResolvedValue(null);
    expect(await meta({}, "inconnue")).toEqual({});
  });
});
