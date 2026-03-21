// __tests__/unit/components/product-wizard-initial-step.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock client-side dependencies so the module can be imported in node environment
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: vi.fn(() => ({ current: null })),
    useState: vi.fn((init: unknown) => [init, vi.fn()]),
    useTransition: vi.fn(() => [false, vi.fn()]),
  };
});
vi.mock("@/components/ui/button", () => ({ Button: vi.fn() }));
vi.mock("@/actions/admin/products", () => ({
  saveDraftStep: vi.fn(),
  updateProduct: vi.fn(),
}));
vi.mock("@/components/admin/product-wizard/wizard-stepper", () => ({ WizardStepper: vi.fn() }));
vi.mock("@/components/admin/product-wizard/step-identity", () => ({ StepIdentity: vi.fn() }));
vi.mock("@/components/admin/product-wizard/step-pricing", () => ({ StepPricing: vi.fn() }));
vi.mock("@/components/admin/product-wizard/step-media", () => ({ StepMedia: vi.fn() }));
vi.mock("@/components/admin/product-wizard/step-finalization", () => ({ StepFinalization: vi.fn() }));

import { getInitialStep } from "@/components/admin/product-wizard";
import type { ProductDetail } from "@/lib/db/types";

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "prod-1",
    name: "",
    slug: "draft-prod-1",
    category_id: null,
    brand: null,
    sku: null,
    description: null,
    short_description: null,
    base_price: 0,
    compare_price: null,
    stock_quantity: 0,
    low_stock_threshold: 5,
    weight_grams: null,
    meta_title: null,
    meta_description: null,
    is_active: 0,
    is_featured: 0,
    is_draft: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    images: [],
    variants: [],
    attributes: [],
    ...overrides,
  } as ProductDetail;
}

describe("getInitialStep", () => {
  it("retourne 0 si le produit n'a pas de nom", () => {
    expect(getInitialStep(makeProduct({ name: "" }))).toBe(0);
  });

  it("retourne 1 si le nom est défini mais pas la catégorie", () => {
    expect(getInitialStep(makeProduct({ name: "Test", category_id: null, base_price: 0 }))).toBe(1);
  });

  it("retourne 1 si le nom est défini mais le prix est 0", () => {
    expect(getInitialStep(makeProduct({ name: "Test", category_id: "cat-1", base_price: 0 }))).toBe(1);
  });

  it("retourne 2 si nom et catégorie sont définis mais pas d'image principale", () => {
    expect(
      getInitialStep(
        makeProduct({
          name: "Test",
          category_id: "cat-1",
          base_price: 125000,
          images: [{ id: "img-1", product_id: "prod-1", url: "/img.jpg", alt: null, sort_order: 0, is_primary: 0 }],
        }),
      ),
    ).toBe(2);
  });

  it("retourne 2 si aucune image", () => {
    expect(
      getInitialStep(
        makeProduct({ name: "Test", category_id: "cat-1", base_price: 125000, images: [] }),
      ),
    ).toBe(2);
  });

  it("retourne 3 si tout est rempli avec une image principale", () => {
    expect(
      getInitialStep(
        makeProduct({
          name: "Test",
          category_id: "cat-1",
          base_price: 125000,
          images: [{ id: "img-1", product_id: "prod-1", url: "/img.jpg", alt: null, sort_order: 0, is_primary: 1 }],
        }),
      ),
    ).toBe(3);
  });
});
