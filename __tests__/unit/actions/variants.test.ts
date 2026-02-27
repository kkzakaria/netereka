import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { getProductVariants } from "@/actions/variants";

const fakeVariant = {
  id: "var-1",
  product_id: "prod-1",
  name: "128 Go",
  sku: null,
  price: 150000,
  compare_price: null,
  stock_quantity: 5,
  attributes: "{}",
  is_active: 1,
  sort_order: 0,
};

describe("getProductVariants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne les variantes actives d'un produit", async () => {
    mocks.query.mockResolvedValue([fakeVariant]);
    const result = await getProductVariants("prod-1");
    expect(result).toEqual([fakeVariant]);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("product_id = ?"),
      ["prod-1"]
    );
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("AND is_active = 1"),
      ["prod-1"]
    );
  });

  it("retourne un tableau vide si aucune variante", async () => {
    mocks.query.mockResolvedValue([]);
    const result = await getProductVariants("prod-1");
    expect(result).toEqual([]);
  });

  it("retourne un tableau vide si productId invalide", async () => {
    const result = await getProductVariants("");
    expect(result).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("retourne un tableau vide si productId dépasse 50 caractères", async () => {
    const result = await getProductVariants("a".repeat(51));
    expect(result).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("propage l'erreur si la base de données échoue", async () => {
    mocks.query.mockRejectedValue(new Error("D1 unavailable"));
    await expect(getProductVariants("prod-1")).rejects.toThrow("D1 unavailable");
  });
});
