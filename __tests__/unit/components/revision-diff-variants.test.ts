import { describe, it, expect } from "vitest";
import { diffVariants } from "@/components/admin/revision-diff";
import type { ProductVariant } from "@/lib/db/types";

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "v1",
    product_id: "p1",
    name: "Rouge",
    sku: null,
    price: 10000,
    compare_price: null,
    stock_quantity: 5,
    attributes: JSON.stringify({ color: "Rouge:#ff0000" }),
    is_active: 1,
    sort_order: 0,
    ...overrides,
  };
}

// `diffVariants` (components/admin/revision-diff.tsx) recalcule, pour
// l'aperçu affiché sur /revisions, la même formule de prix que
// `buildSetVariantsStatements` (lib/db/revisions.ts) appliquera réellement.
// Un décalage entre les deux montrerait à l'administrateur un prix que
// l'application ne produirait pas — exactement le mensonge que ce test
// existe pour empêcher.
describe("diffVariants", () => {
  it("marque conservée une couleur présente des deux côtés, sans changement", () => {
    const rows = diffVariants(
      [variant()],
      [{ color_name: "Rouge", color_hex: "#ff0000", price: 10000, stock: 5 }],
      { uniformPrice: false, basePrice: 12000 },
    );
    expect(rows).toEqual([
      {
        key: "Rouge:#ff0000",
        colorName: "Rouge",
        colorHex: "#ff0000",
        status: "kept",
        currentPrice: 10000,
        currentStock: 5,
        proposedPrice: 10000,
        proposedStock: 5,
      },
    ]);
  });

  it("marque conservée mais changée une couleur dont le stock ou le prix diffère", () => {
    const rows = diffVariants(
      [variant({ price: 10000, stock_quantity: 5 })],
      [{ color_name: "Rouge", color_hex: "#ff0000", price: 11000, stock: 8 }],
      { uniformPrice: false, basePrice: 12000 },
    );
    expect(rows[0].status).toBe("kept");
    expect(rows[0].currentPrice).toBe(10000);
    expect(rows[0].proposedPrice).toBe(11000);
    expect(rows[0].currentStock).toBe(5);
    expect(rows[0].proposedStock).toBe(8);
  });

  it("marque ajoutée une couleur absente de l'état actuel", () => {
    const rows = diffVariants(
      [],
      [{ color_name: "Bleu", color_hex: "#0000ff", price: 9000, stock: 3 }],
      { uniformPrice: false, basePrice: 12000 },
    );
    expect(rows).toEqual([
      {
        key: "Bleu:#0000ff",
        colorName: "Bleu",
        colorHex: "#0000ff",
        status: "added",
        currentPrice: null,
        currentStock: null,
        proposedPrice: 9000,
        proposedStock: 3,
      },
    ]);
  });

  it("marque retirée une couleur absente de la liste proposée", () => {
    const rows = diffVariants(
      [variant({ attributes: JSON.stringify({ color: "Vert:#00ff00" }), price: 8000, stock_quantity: 2 })],
      [],
      { uniformPrice: false, basePrice: 12000 },
    );
    expect(rows).toEqual([
      {
        key: "Vert:#00ff00",
        colorName: "Vert",
        colorHex: "#00ff00",
        status: "removed",
        currentPrice: 8000,
        currentStock: 2,
        proposedPrice: null,
        proposedStock: null,
      },
    ]);
  });

  it("uniform_price=true impose le prix de base même si une couleur proposait un prix propre", () => {
    const rows = diffVariants(
      [],
      [{ color_name: "Noir", color_hex: "#000000", price: 5000, stock: 1 }],
      { uniformPrice: true, basePrice: 15000 },
    );
    expect(rows[0].proposedPrice).toBe(15000);
  });

  it("un prix proposé null retombe sur le prix de base même si uniform_price=false", () => {
    const rows = diffVariants(
      [],
      [{ color_name: "Blanc", color_hex: "#ffffff", price: null, stock: 4 }],
      { uniformPrice: false, basePrice: 20000 },
    );
    expect(rows[0].proposedPrice).toBe(20000);
  });

  it("ignore une variante actuelle aux attributs malformés ou multi-clés, comme à l'application", () => {
    const rows = diffVariants(
      [
        variant({ id: "v1", attributes: "not json" }),
        variant({ id: "v2", attributes: JSON.stringify({ size: "M" }) }),
        variant({ id: "v3", attributes: JSON.stringify({ color: "Rouge:#ff0000", size: "M" }) }),
      ],
      [],
      { uniformPrice: false, basePrice: 10000 },
    );
    expect(rows).toEqual([]);
  });
});
