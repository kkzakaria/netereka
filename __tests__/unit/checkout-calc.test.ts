import { describe, it, expect } from "vitest";
import {
  validatePromoEligibility,
  calculateDiscount,
  calculateOrderTotal,
  calculateSubtotal,
  resolveOrderLine,
  countActiveVariantsByProduct,
  type OrderLineInput,
} from "@/lib/utils/checkout";
import type { PromoCode } from "@/lib/db/types";

function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: "promo-1",
    code: "NOEL2024",
    description: null,
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: null,
    max_uses: null,
    used_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: 1,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── validatePromoEligibility ───

describe("validatePromoEligibility", () => {
  it("retourne null pour un code promo valide sans contraintes", () => {
    const promo = makePromo();
    expect(validatePromoEligibility(promo, 50000)).toBeNull();
  });

  it("rejette un code pas encore actif (starts_at dans le futur)", () => {
    const promo = makePromo({ starts_at: "2099-01-01T00:00:00Z" });
    const error = validatePromoEligibility(promo, 50000);
    expect(error).toBe("Ce code promo n'est pas encore actif");
  });

  it("accepte un code dont starts_at est passé", () => {
    const promo = makePromo({ starts_at: "2020-01-01T00:00:00Z" });
    expect(validatePromoEligibility(promo, 50000)).toBeNull();
  });

  it("rejette un code expiré", () => {
    const promo = makePromo({ expires_at: "2020-01-01T00:00:00Z" });
    const error = validatePromoEligibility(promo, 50000);
    expect(error).toBe("Ce code promo a expire");
  });

  it("accepte un code dont expires_at est dans le futur", () => {
    const promo = makePromo({ expires_at: "2099-12-31T23:59:59Z" });
    expect(validatePromoEligibility(promo, 50000)).toBeNull();
  });

  it("rejette un code dont max_uses est atteint", () => {
    const promo = makePromo({ max_uses: 100, used_count: 100 });
    const error = validatePromoEligibility(promo, 50000);
    expect(error).toBe("Ce code promo a atteint sa limite d'utilisation");
  });

  it("accepte un code dont max_uses n'est pas encore atteint", () => {
    const promo = makePromo({ max_uses: 100, used_count: 99 });
    expect(validatePromoEligibility(promo, 50000)).toBeNull();
  });

  it("rejette si le subtotal est inférieur au montant minimum", () => {
    const promo = makePromo({ min_order_amount: 30000 });
    const error = validatePromoEligibility(promo, 20000);
    expect(error).toBe("Montant minimum de commande: 30000 FCFA");
  });

  it("accepte si le subtotal est égal au montant minimum", () => {
    const promo = makePromo({ min_order_amount: 30000 });
    expect(validatePromoEligibility(promo, 30000)).toBeNull();
  });

  it("accepte si le subtotal dépasse le montant minimum", () => {
    const promo = makePromo({ min_order_amount: 30000 });
    expect(validatePromoEligibility(promo, 50000)).toBeNull();
  });

  it("vérifie les dates avec un timestamp personnalisé", () => {
    const promo = makePromo({
      starts_at: "2024-06-01T00:00:00Z",
      expires_at: "2024-12-31T23:59:59Z",
    });
    const midYear = new Date("2024-08-15T12:00:00Z").getTime();
    expect(validatePromoEligibility(promo, 50000, midYear)).toBeNull();

    const tooEarly = new Date("2024-01-01T00:00:00Z").getTime();
    expect(validatePromoEligibility(promo, 50000, tooEarly)).toBe(
      "Ce code promo n'est pas encore actif"
    );

    const tooLate = new Date("2025-02-01T00:00:00Z").getTime();
    expect(validatePromoEligibility(promo, 50000, tooLate)).toBe(
      "Ce code promo a expire"
    );
  });
});

// ─── calculateDiscount ───

describe("calculateDiscount", () => {
  describe("pourcentage", () => {
    it("calcule 10% de 50 000", () => {
      const result = calculateDiscount("percentage", 10, 50000);
      expect(result.discount).toBe(5000);
      expect(result.label).toBe("-10%");
    });

    it("calcule 25% de 80 000", () => {
      const result = calculateDiscount("percentage", 25, 80000);
      expect(result.discount).toBe(20000);
      expect(result.label).toBe("-25%");
    });

    it("arrondit les résultats décimaux", () => {
      // 15% de 33 333 = 4999.95 → arrondi à 5000
      const result = calculateDiscount("percentage", 15, 33333);
      expect(result.discount).toBe(5000);
    });

    it("100% donne le subtotal entier", () => {
      const result = calculateDiscount("percentage", 100, 50000);
      expect(result.discount).toBe(50000);
    });

    it("0% donne zéro", () => {
      const result = calculateDiscount("percentage", 0, 50000);
      expect(result.discount).toBe(0);
    });
  });

  describe("montant fixe", () => {
    it("applique le montant fixe directement", () => {
      const result = calculateDiscount("fixed", 5000, 50000);
      expect(result.discount).toBe(5000);
      expect(result.label).toBe("-5000 FCFA");
    });

    it("cap la réduction au subtotal", () => {
      const result = calculateDiscount("fixed", 60000, 50000);
      expect(result.discount).toBe(50000); // cappé à 50000
    });

    it("montant fixe de 0", () => {
      const result = calculateDiscount("fixed", 0, 50000);
      expect(result.discount).toBe(0);
    });
  });

  describe("cap au subtotal", () => {
    it("un pourcentage > 100% est cappé au subtotal", () => {
      // Cas théorique : 150% de 10000 = 15000, cappé à 10000
      const result = calculateDiscount("percentage", 150, 10000);
      expect(result.discount).toBe(10000);
    });

    it("subtotal de 0 donne toujours 0", () => {
      const result = calculateDiscount("percentage", 50, 0);
      expect(result.discount).toBe(0);
    });
  });
});

// ─── calculateOrderTotal ───

describe("calculateOrderTotal", () => {
  it("calcule subtotal + livraison - réduction", () => {
    expect(calculateOrderTotal(50000, 2000, 5000)).toBe(47000);
  });

  it("ne descend jamais en dessous de 0", () => {
    expect(calculateOrderTotal(10000, 2000, 50000)).toBe(0);
  });

  it("sans réduction, total = subtotal + livraison", () => {
    expect(calculateOrderTotal(50000, 3000, 0)).toBe(53000);
  });

  it("livraison gratuite et sans réduction", () => {
    expect(calculateOrderTotal(25000, 0, 0)).toBe(25000);
  });

  it("réduction exactement égale au subtotal + livraison", () => {
    expect(calculateOrderTotal(50000, 2000, 52000)).toBe(0);
  });

  it("gère de grands montants", () => {
    expect(calculateOrderTotal(2500000, 5000, 250000)).toBe(2255000);
  });
});

// ─── calculateSubtotal ───

describe("calculateSubtotal", () => {
  it("calcule le sous-total d'un seul article", () => {
    expect(calculateSubtotal([{ unitPrice: 25000, quantity: 2 }])).toBe(50000);
  });

  it("calcule le sous-total de plusieurs articles", () => {
    expect(
      calculateSubtotal([
        { unitPrice: 15000, quantity: 1 },
        { unitPrice: 25000, quantity: 3 },
        { unitPrice: 5000, quantity: 2 },
      ])
    ).toBe(15000 + 75000 + 10000);
  });

  it("retourne 0 pour un panier vide", () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it("gère une quantité de 1", () => {
    expect(calculateSubtotal([{ unitPrice: 99000, quantity: 1 }])).toBe(99000);
  });
});

// ─── resolveOrderLine ───

function makeLine(overrides: Partial<OrderLineInput> = {}): OrderLineInput {
  return {
    product: {
      name: "Casque Bluetooth XYZ",
      base_price: 10000,
      stock_quantity: 5,
      activeVariantCount: 0,
    },
    variant: null,
    quantity: 1,
    ...overrides,
  };
}

describe("resolveOrderLine", () => {
  it("rejette un variantId nul quand le produit a des variantes actives", () => {
    const result = resolveOrderLine(
      makeLine({ product: { ...makeLine().product, activeVariantCount: 3 } })
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/variante/i);
  });

  it("accepte un variantId nul quand le produit n'a aucune variante", () => {
    const result = resolveOrderLine(makeLine());

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.unitPrice).toBe(10000);
  });

  it("facture depuis la variante quand elle est fournie", () => {
    const result = resolveOrderLine(
      makeLine({
        product: { ...makeLine().product, activeVariantCount: 3 },
        variant: { name: "Rouge", price: 15000, stock_quantity: 2 },
      })
    );

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.unitPrice).toBe(15000);
  });

  it("rejette une variante dont le stock est insuffisant", () => {
    const result = resolveOrderLine(
      makeLine({
        product: { ...makeLine().product, activeVariantCount: 1 },
        variant: { name: "Rouge", price: 15000, stock_quantity: 1 },
        quantity: 2,
      })
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/stock/i);
  });

  it("accepte une variante quand le stock est exactement suffisant", () => {
    const result = resolveOrderLine(
      makeLine({
        product: { ...makeLine().product, activeVariantCount: 1 },
        variant: { name: "Rouge", price: 15000, stock_quantity: 2 },
        quantity: 2,
      })
    );

    expect(result.ok).toBe(true);
  });

  it("rejette un produit sans variante dont le stock est insuffisant", () => {
    const result = resolveOrderLine(makeLine({ quantity: 10 }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/stock/i);
  });

  it("mentionne le nom du produit dans le message de garde variante", () => {
    const result = resolveOrderLine(
      makeLine({
        product: {
          name: "Enceinte Portable ABC",
          base_price: 20000,
          stock_quantity: 5,
          activeVariantCount: 2,
        },
      })
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("Enceinte Portable ABC");
  });
});

// ─── countActiveVariantsByProduct ───

describe("countActiveVariantsByProduct", () => {
  it("compte les variantes actives par produit", () => {
    const counts = countActiveVariantsByProduct([
      { product_id: "p1" },
      { product_id: "p1" },
      { product_id: "p2" },
    ]);

    expect(counts.get("p1")).toBe(2);
    expect(counts.get("p2")).toBe(1);
  });

  it("retourne une map vide pour une liste vide", () => {
    const counts = countActiveVariantsByProduct([]);
    expect(counts.size).toBe(0);
  });

  it("un produit absent de la liste n'a pas d'entrée dans la map", () => {
    const counts = countActiveVariantsByProduct([{ product_id: "p1" }]);
    expect(counts.get("p2")).toBeUndefined();
  });
});

// ─── resolveOrderLine wired through countActiveVariantsByProduct ───
//
// These pin the exact composition actions/checkout.ts uses:
// `countActiveVariantsByProduct(variantsRaw).get(product.id) ?? 0` feeding
// `resolveOrderLine`'s `activeVariantCount`. If that wiring were ever
// reduced to a literal 0 (or the counting function stopped counting), these
// fail — unlike the resolveOrderLine-only tests above, which pass literals
// directly and can't detect that class of regression.

describe("resolveOrderLine + countActiveVariantsByProduct (wiring)", () => {
  it("rejette un variantId nul quand le comptage réel détecte des variantes actives", () => {
    const activeVariantCountByProduct = countActiveVariantsByProduct([
      { product_id: "p1" },
      { product_id: "p1" },
    ]);

    const result = resolveOrderLine({
      product: {
        name: "Casque Bluetooth XYZ",
        base_price: 10000,
        stock_quantity: 5,
        activeVariantCount: activeVariantCountByProduct.get("p1") ?? 0,
      },
      variant: null,
      quantity: 1,
    });

    expect(result.ok).toBe(false);
  });

  it("accepte un variantId nul quand le comptage réel ne trouve aucune variante pour ce produit", () => {
    const activeVariantCountByProduct = countActiveVariantsByProduct([
      { product_id: "other-product" },
    ]);

    const result = resolveOrderLine({
      product: {
        name: "Casque Bluetooth XYZ",
        base_price: 10000,
        stock_quantity: 5,
        activeVariantCount: activeVariantCountByProduct.get("p1") ?? 0,
      },
      variant: null,
      quantity: 1,
    });

    expect(result.ok).toBe(true);
  });
});
