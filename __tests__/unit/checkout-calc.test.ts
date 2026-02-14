import { describe, it, expect } from "vitest";
import {
  validatePromoEligibility,
  calculateDiscount,
  calculateOrderTotal,
  calculateSubtotal,
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
