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
vi.mock("@/lib/cloudflare/context", () => ({
  getKV: mocks.getKV,
}));
// Deliberately NOT mocked: @/lib/utils/checkout (resolveOrderLine,
// countActiveVariantsByProduct, calculate*) and @/lib/validations/checkout
// (the real Zod schema) — this is the logic under test.

import { createOrder } from "@/actions/checkout";

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
    mocks.queryFirst.mockResolvedValue(null); // no promo code lookups in these tests
    mocks.checkOrderRateLimit.mockResolvedValue(true);
    mocks.getKV.mockResolvedValue({});
    mocks.countPendingOrdersForUser.mockResolvedValue(0);
  });

  it("rejette la creation quand le debit de commandes est depasse — sans toucher au stock", async () => {
    mocks.checkOrderRateLimit.mockResolvedValue(false);
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM products")) return [NO_VARIANT_PRODUCT];
      if (sql.includes("FROM product_variants")) return [];
      return [];
    });

    const result = await createOrder(
      baseInput([{ productId: "prod-no-variant", variantId: null, quantity: 1 }])
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/commandes/i);
    expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
    // The throttle short-circuits before any product/stock lookup runs.
    expect(mocks.query).not.toHaveBeenCalled();
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
});
