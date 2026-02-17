import { describe, it, expect } from "vitest";
import { buildWhere, buildOrderBy } from "@/lib/db/search";

// ─── buildWhere ───

describe("buildWhere", () => {
  it("inclut toujours is_active = 1", () => {
    const { clause, params } = buildWhere({});
    expect(clause).toBe("p.is_active = 1");
    expect(params).toHaveLength(0);
  });

  it("ajoute un filtre de recherche textuelle", () => {
    const { clause, params } = buildWhere({ query: "iphone" });
    expect(clause).toContain("p.name LIKE ?");
    expect(clause).toContain("p.brand LIKE ?");
    expect(clause).toContain("p.description LIKE ?");
    expect(params).toEqual(["%iphone%", "%iphone%", "%iphone%"]);
  });

  it("ajoute un filtre par catégorie", () => {
    const { clause, params } = buildWhere({ category: "smartphones" });
    expect(clause).toContain("c.slug = ?");
    expect(params).toContain("smartphones");
  });

  it("ajoute un filtre par marques", () => {
    const { clause, params } = buildWhere({ brands: ["Apple", "Samsung"] });
    expect(clause).toContain("p.brand IN (?, ?)");
    expect(params).toContain("Apple");
    expect(params).toContain("Samsung");
  });

  it("ajoute un filtre par prix minimum", () => {
    const { clause, params } = buildWhere({ minPrice: 10000 });
    expect(clause).toContain("p.base_price >= ?");
    expect(params).toContain(10000);
  });

  it("ajoute un filtre par prix maximum", () => {
    const { clause, params } = buildWhere({ maxPrice: 500000 });
    expect(clause).toContain("p.base_price <= ?");
    expect(params).toContain(500000);
  });

  it("combine tous les filtres", () => {
    const { clause, params } = buildWhere({
      query: "phone",
      category: "smartphones",
      brands: ["Apple"],
      minPrice: 100000,
      maxPrice: 1000000,
    });
    expect(clause).toContain("p.is_active = 1");
    expect(clause).toContain("p.name LIKE ?");
    expect(clause).toContain("c.slug = ?");
    expect(clause).toContain("p.brand IN (?)");
    expect(clause).toContain("p.base_price >= ?");
    expect(clause).toContain("p.base_price <= ?");
    // 3 (query LIKE) + 1 (category) + 1 (brand) + 1 (min) + 1 (max) = 7
    expect(params).toHaveLength(7);
  });

  it("ajoute un filtre par categoryIds", () => {
    const { clause, params } = buildWhere({ categoryIds: ["id1", "id2"] });
    expect(clause).toContain("p.category_id IN (?, ?)");
    expect(params).toContain("id1");
    expect(params).toContain("id2");
  });

  it("categoryIds a priorité sur category", () => {
    const { clause } = buildWhere({ categoryIds: ["id1"], category: "smartphones" });
    expect(clause).toContain("p.category_id IN (?)");
    expect(clause).not.toContain("c.slug = ?");
  });

  it("ignore categoryIds si le tableau est vide", () => {
    const { clause } = buildWhere({ categoryIds: [] });
    expect(clause).not.toContain("p.category_id IN");
  });

  it("ignore brands si le tableau est vide", () => {
    const { clause } = buildWhere({ brands: [] });
    expect(clause).not.toContain("p.brand IN");
  });

  it("gère minPrice à 0", () => {
    const { clause, params } = buildWhere({ minPrice: 0 });
    expect(clause).toContain("p.base_price >= ?");
    expect(params).toContain(0);
  });

  it("gère maxPrice à 0", () => {
    const { clause, params } = buildWhere({ maxPrice: 0 });
    expect(clause).toContain("p.base_price <= ?");
    expect(params).toContain(0);
  });

  it("une seule marque génère un seul placeholder", () => {
    const { clause } = buildWhere({ brands: ["Apple"] });
    expect(clause).toContain("p.brand IN (?)");
  });

  it("trois marques génèrent trois placeholders", () => {
    const { clause } = buildWhere({ brands: ["Apple", "Samsung", "Xiaomi"] });
    expect(clause).toContain("p.brand IN (?, ?, ?)");
  });

  it("la recherche textuelle utilise des paramètres bindés (pas d'interpolation)", () => {
    const { clause, params } = buildWhere({ query: '"; DROP TABLE --' });
    expect(clause).not.toContain("DROP TABLE");
    expect(params[0]).toBe('%"; DROP TABLE --%');
  });
});

// ─── buildOrderBy ───

describe("buildOrderBy", () => {
  it("trie par prix croissant", () => {
    expect(buildOrderBy("price_asc")).toBe("ORDER BY p.base_price ASC");
  });

  it("trie par prix décroissant", () => {
    expect(buildOrderBy("price_desc")).toBe("ORDER BY p.base_price DESC");
  });

  it("trie par nouveauté", () => {
    expect(buildOrderBy("newest")).toBe("ORDER BY p.created_at DESC");
  });

  it("utilise le tri par défaut (featured + date) si pas de sort", () => {
    expect(buildOrderBy()).toBe("ORDER BY p.is_featured DESC, p.created_at DESC");
  });

  it("utilise le tri par défaut pour une valeur inconnue (fallback du switch default)", () => {
    // Comportement voulu : toute valeur non reconnue retombe sur le tri featured+date
    expect(buildOrderBy("unknown")).toBe("ORDER BY p.is_featured DESC, p.created_at DESC");
  });
});
