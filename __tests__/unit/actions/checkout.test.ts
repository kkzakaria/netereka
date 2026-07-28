import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession } from "../../helpers/mocks";

// This suite exercises the real createOrder Server Action (actions/checkout.ts)
// with mocked I/O, rather than only the pure resolveOrderLine/
// countActiveVariantsByProduct helpers it calls (see checkout-calc.test.ts).
// Those helper tests can't see a regression at the *call site* itself — e.g.
// `activeVariantCount: activeVariantCountByProduct.get(product.id) ?? 0`
// being reduced to a hardcoded `0` — because they never import or execute
// actions/checkout.ts. These tests do, so that specific mutation fails here.

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  query: vi.fn(),
  queryFirst: vi.fn(),
  getDeliveryZoneByCommune: vi.fn(),
  getAddressById: vi.fn(),
  createAddress: vi.fn(),
  createOrderWithItems: vi.fn(),
  countPendingOrdersForUser: vi.fn(),
  notifyOrderConfirmation: vi.fn(),
  checkOrderRateLimit: vi.fn(),
  checkPromoRateLimit: vi.fn(),
  getKV: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db", () => ({
  query: mocks.query,
  queryFirst: mocks.queryFirst,
}));
vi.mock("@/lib/db/delivery-zones", () => ({
  getDeliveryZoneByCommune: mocks.getDeliveryZoneByCommune,
}));
vi.mock("@/lib/db/addresses", () => ({
  getAddressById: mocks.getAddressById,
  createAddress: mocks.createAddress,
}));
vi.mock("@/lib/db/orders", () => ({
  createOrderWithItems: mocks.createOrderWithItems,
  countPendingOrdersForUser: mocks.countPendingOrdersForUser,
  MAX_PENDING_ORDERS_PER_USER: 3,
}));
vi.mock("@/lib/notifications", () => ({
  notifyOrderConfirmation: mocks.notifyOrderConfirmation,
}));
vi.mock("@/lib/rate-limit/orders", () => ({
  checkOrderRateLimit: mocks.checkOrderRateLimit,
}));
vi.mock("@/lib/rate-limit/promo", () => ({
  checkPromoRateLimit: mocks.checkPromoRateLimit,
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getKV: mocks.getKV,
}));
// Deliberately NOT mocked: @/lib/utils/checkout (resolveOrderLine,
// countActiveVariantsByProduct, calculate*) and @/lib/validations/checkout
// (the real Zod schema) — this is the logic under test.

import { createOrder, validatePromoCode } from "@/actions/checkout";
import type { PromoCode } from "@/lib/db/types";

const NO_VARIANT_PRODUCT = {
  id: "prod-no-variant",
  name: "Casque Bluetooth XYZ",
  base_price: 10000,
  stock_quantity: 5,
  is_active: 1,
};

const VARIANT_PRODUCT = {
  id: "prod-with-variant",
  name: "Smartphone ABC",
  base_price: 150000, // display-only "starting from" price — lower than any real variant
  stock_quantity: 5,
  is_active: 1,
};

const OTHER_PRODUCT = {
  id: "prod-other",
  name: "Autre Produit",
  base_price: 50000,
  stock_quantity: 5,
  is_active: 1,
};

const VARIANT_A = {
  id: "variant-a",
  product_id: "prod-with-variant",
  name: "256GB",
  price: 200000,
  stock_quantity: 3,
  is_active: 1,
};

const VARIANT_OF_OTHER_PRODUCT = {
  id: "variant-other",
  product_id: "prod-other",
  name: "Standard",
  price: 60000,
  stock_quantity: 3,
  is_active: 1,
};

const ZONE = {
  id: "zone-1",
  name: "Plateau",
  commune: "Plateau",
  fee: 1000,
  estimated_hours: 24,
  is_active: 1,
};

function baseInput(items: Array<{ productId: string; variantId: string | null; quantity: number }>) {
  return {
    fullName: "Koné Amadou",
    phone: "0102030405",
    street: "Rue des Jardins, Cocody",
    commune: "Plateau",
    items,
  };
}

describe("createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.getDeliveryZoneByCommune.mockResolvedValue(ZONE);
    mocks.createOrderWithItems.mockResolvedValue({ orderId: "order-1", orderNumber: "ORD-TEST01" });
    mocks.notifyOrderConfirmation.mockResolvedValue(undefined);
    mocks.queryFirst.mockResolvedValue(null); // no promo row matches by default (see the nested "code promo" describe for cases that supply one)
    mocks.checkOrderRateLimit.mockResolvedValue(true);
    mocks.checkPromoRateLimit.mockResolvedValue(true);
    mocks.getKV.mockResolvedValue({});
    mocks.countPendingOrdersForUser.mockResolvedValue(0);
  });

  it("rejette la creation quand le debit de commandes est depasse — sans creer de commande ni d'adresse", async () => {
    mocks.checkOrderRateLimit.mockResolvedValue(false);
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [NO_VARIANT_PRODUCT];
      if (sql.includes("FROM product_variants")) return [];
      return [];
    });

    const result = await createOrder({
      ...baseInput([{ productId: "prod-no-variant", variantId: null, quantity: 1 }]),
      // saveAddress: true exercises the exact bypass a throttled call must not
      // reach: createAddress is an unconditional INSERT with no dedup and no
      // per-user cap of its own, and it used to run before the quota check.
      saveAddress: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/commandes/i);
    // The throttle is checked right before the first persistent write (see
    // actions/checkout.ts's comment on why: it should only cost a slot on
    // attempts that clear every other check), so read-only validation and
    // product lookups above it still run — but nothing that writes does.
    expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
    expect(mocks.createAddress).not.toHaveBeenCalled();
    expect(mocks.checkOrderRateLimit).toHaveBeenCalledTimes(1);
  });

  it("rejette la creation quand l'utilisateur a deja trop de commandes en attente", async () => {
    mocks.countPendingOrdersForUser.mockResolvedValue(3);
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [NO_VARIANT_PRODUCT];
      if (sql.includes("FROM product_variants")) return [];
      return [];
    });

    const result = await createOrder(
      baseInput([{ productId: "prod-no-variant", variantId: null, quantity: 1 }])
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/attente/i);
    expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
  });

  it("accepte un variantId nul pour un produit sans variante, facturé au base_price", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [NO_VARIANT_PRODUCT];
      if (sql.includes("FROM product_variants")) return [];
      return [];
    });

    const result = await createOrder(
      baseInput([{ productId: "prod-no-variant", variantId: null, quantity: 1 }])
    );

    expect(result.success).toBe(true);
    expect(mocks.createOrderWithItems).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ productId: "prod-no-variant", variantId: null, unitPrice: 10000 }),
      ])
    );
  });

  it("rejette un variantId nul pour un produit qui a des variantes actives — appelle le vrai createOrder, pas seulement resolveOrderLine", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [VARIANT_PRODUCT];
      if (sql.includes("FROM product_variants")) return [VARIANT_A];
      return [];
    });

    const result = await createOrder(
      baseInput([{ productId: "prod-with-variant", variantId: null, quantity: 1 }])
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/variante/i);
    expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
  });

  it("facture depuis la variante quand un variantId valide est fourni", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [VARIANT_PRODUCT];
      if (sql.includes("FROM product_variants")) return [VARIANT_A];
      return [];
    });

    const result = await createOrder(
      baseInput([{ productId: "prod-with-variant", variantId: "variant-a", quantity: 1 }])
    );

    expect(result.success).toBe(true);
    expect(mocks.createOrderWithItems).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ productId: "prod-with-variant", variantId: "variant-a", unitPrice: 200000 }),
      ])
    );
  });

  it("rejette un variantId appartenant à un autre produit", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [VARIANT_PRODUCT, OTHER_PRODUCT];
      if (sql.includes("FROM product_variants")) return [VARIANT_A, VARIANT_OF_OTHER_PRODUCT];
      return [];
    });

    const result = await createOrder(
      baseInput([{ productId: "prod-with-variant", variantId: "variant-other", quantity: 1 }])
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/introuvable/i);
    expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
  });

  // createOrder resolves a promo code itself (step 8, before its own
  // throttle at step 9) rather than going through validatePromoCode, so it
  // needs its own coverage: nothing above exercises this path with a promo
  // code at all (queryFirst defaults to null, i.e. no promo row, in every
  // other test in this file).
  describe("code promo", () => {
    function orderInput(promoCode: string) {
      return {
        ...baseInput([{ productId: "prod-no-variant", variantId: null, quantity: 1 }]),
        promoCode,
      };
    }

    beforeEach(() => {
      mocks.query.mockImplementation(async (sql: string) => {
        if (sql.includes("FROM products")) return [NO_VARIANT_PRODUCT];
        if (sql.includes("FROM product_variants")) return [];
        return [];
      });
    });

    it("rejette un code promo inexistant sans créer de commande", async () => {
      const result = await createOrder(orderInput("DOESNOTEXIST"));

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Ce code promo est invalide ou n'est pas applicable à votre commande."
      );
      expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
    });

    it("court-circuite avant toute lecture de la table promo_codes une fois le quota de codes promo dépassé, sans créer de commande", async () => {
      mocks.checkPromoRateLimit.mockResolvedValueOnce(false);

      const result = await createOrder(orderInput("PEU-IMPORTE"));

      expect(result.success).toBe(false);
      expect(mocks.queryFirst).not.toHaveBeenCalled();
      expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
    });

    it("renvoie, une fois le quota de codes promo dépassé, exactement le même résultat qu'un code promo inexistant", async () => {
      const unknown = await createOrder(orderInput("DOESNOTEXIST"));

      mocks.checkPromoRateLimit.mockResolvedValueOnce(false);
      const throttled = await createOrder(orderInput("PEU-IMPORTE"));

      expect(throttled).toEqual(unknown);
      expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
    });

    it("consulte le débit de codes promo partagé (même clé que validatePromoCode) avec l'id de l'utilisateur authentifié", async () => {
      await createOrder(orderInput("DOESNOTEXIST"));

      expect(mocks.checkPromoRateLimit).toHaveBeenCalledWith(expect.anything(), "user-1");
    });
  });
});

// validatePromoCode must respond identically — same message, same
// PromoResult shape — no matter why a code was rejected, and the throttle's
// own rejection must be indistinguishable from an ordinary one. Otherwise
// the response itself tells a caller something about the promo_codes table
// that they shouldn't be able to learn from the outside.
describe("validatePromoCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.checkPromoRateLimit.mockResolvedValue(true);
    mocks.getKV.mockResolvedValue({});
  });

  const BASE_PROMO: PromoCode = {
    id: "promo-1",
    code: "SOLDES2026",
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
  };

  it("renvoie exactement le même objet quel que soit le motif d'échec (inexistant, expiré, pas encore actif, quota d'utilisation atteint, montant minimum non atteint)", async () => {
    const now = Date.now();
    const failureCases: Array<PromoCode | null> = [
      null, // code doesn't exist at all
      { ...BASE_PROMO, expires_at: new Date(now - 86_400_000).toISOString() }, // expired
      { ...BASE_PROMO, starts_at: new Date(now + 86_400_000).toISOString() }, // not yet active
      { ...BASE_PROMO, max_uses: 5, used_count: 5 }, // usage cap reached
      { ...BASE_PROMO, min_order_amount: 50_000 }, // subtotal (10 000) below minimum
    ];

    // Comparing full result *objects* (not just `.error`) is deliberate: a
    // future change that adds a field to only one failure path (e.g. a
    // `minimumRequired` on the below-minimum branch) would keep a
    // string-only assertion green while reopening the exact oracle this
    // fixes — a shape difference is just as much of a leak as a text one.
    const results: unknown[] = [];
    for (const promoRow of failureCases) {
      mocks.queryFirst.mockResolvedValueOnce(promoRow);
      const result = await validatePromoCode("SOLDES2026", 10_000);
      expect(result.valid).toBe(false);
      results.push(result);
    }

    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it("ne révèle pas le montant minimum de commande dans le message d'échec", async () => {
    mocks.queryFirst.mockResolvedValueOnce({ ...BASE_PROMO, min_order_amount: 50_000 });

    const result = await validatePromoCode("SOLDES2026", 10_000);

    expect(result.valid).toBe(false);
    expect(result.error).not.toMatch(/50.?000/);
  });

  it("applique toujours la remise pour un code valide", async () => {
    mocks.queryFirst.mockResolvedValueOnce(BASE_PROMO);

    const result = await validatePromoCode("SOLDES2026", 10_000);

    expect(result.valid).toBe(true);
    expect(result.discount).toBe(1_000);
    expect(result.promoCodeId).toBe("promo-1");
  });

  it("court-circuite avant toute lecture de la table promo_codes une fois le quota dépassé", async () => {
    mocks.checkPromoRateLimit.mockResolvedValueOnce(false);

    const result = await validatePromoCode("PEU-IMPORTE", 10_000);

    expect(result.valid).toBe(false);
    expect(mocks.queryFirst).not.toHaveBeenCalled();
  });

  it("renvoie, une fois le quota dépassé, exactement le même objet qu'un code inexistant", async () => {
    mocks.queryFirst.mockResolvedValueOnce(null);
    const unknown = await validatePromoCode("DOESNOTEXIST", 10_000);

    mocks.checkPromoRateLimit.mockResolvedValueOnce(false);
    const throttled = await validatePromoCode("PEU-IMPORTE", 10_000);

    expect(throttled).toEqual(unknown);
  });

  it("consulte le débit de codes promo avec l'id de l'utilisateur authentifié", async () => {
    mocks.queryFirst.mockResolvedValueOnce(null);

    await validatePromoCode("DOESNOTEXIST", 10_000);

    expect(mocks.checkPromoRateLimit).toHaveBeenCalledWith(expect.anything(), "user-1");
  });
});
