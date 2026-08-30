// __tests__/unit/components/product-card-actions.test.ts
//
// Locks the 44px mobile touch targets required by CLAUDE.md ("Min 44px touch
// targets, mobile-first") on the ProductCard action bar. See issue #173.
//
// The suite runs in the `node` environment (no jsdom / testing-library), so the
// component is invoked as a plain function and the returned React element tree
// is walked to inspect the className handed to each button.
import { describe, it, expect, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: vi.fn((init: unknown) => [init, vi.fn()]),
  };
});
vi.mock("next/dynamic", () => ({ default: () => "DynamicStub" }));
vi.mock("@/stores/cart-store", () => ({ useCartStore: vi.fn(() => vi.fn()) }));
vi.mock("@/components/ui/button", () => ({ Button: "Button" }));
vi.mock("@hugeicons/react", () => ({ HugeiconsIcon: "HugeiconsIcon" }));

import type { ReactElement } from "react";
import { ProductCardActions } from "@/components/storefront/product-card-actions";
import type { ProductCardData } from "@/lib/db/types";

const PRODUCT: ProductCardData = {
  id: "prod-1",
  name: "Casque Bluetooth",
  slug: "casque-bluetooth",
  base_price: 25000,
  compare_price: null,
  brand: null,
  is_featured: 0,
  stock_quantity: 5,
  image_url: null,
  category_name: null,
  variant_count: 0,
};

type AnyProps = Record<string, unknown>;

/** Depth-first walk over a React element tree, yielding every element's props. */
function collectProps(node: unknown, out: AnyProps[] = []): AnyProps[] {
  if (Array.isArray(node)) {
    for (const child of node) collectProps(child, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const element = node as ReactElement<AnyProps>;
  if (!("props" in element) || !element.props) return out;
  out.push(element.props);
  collectProps(element.props.children, out);
  return out;
}

function renderProps(product: ProductCardData = PRODUCT): AnyProps[] {
  return collectProps(ProductCardActions({ product }));
}

/** Every button on the row must be 44px tall on mobile, 32px from `sm:` up. */
function expectResponsiveTouchTarget(className: unknown) {
  expect(typeof className).toBe("string");
  const classes = String(className).split(/\s+/);
  expect(classes).toContain("h-11");
  expect(classes).toContain("sm:h-8");
}

describe("ProductCardActions touch targets", () => {
  it("gives the add-to-cart button a 44px mobile height", () => {
    const cartButton = renderProps().find(
      (p) => typeof p["aria-label"] === "string" && String(p["aria-label"]).includes("au panier")
    );
    expect(cartButton).toBeDefined();
    expectResponsiveTouchTarget(cartButton!.className);
  });

  it("keeps the 44px mobile height when the product is out of stock", () => {
    const props = renderProps({ ...PRODUCT, stock_quantity: 0 });
    const cartButton = props.find((p) => p["aria-label"] === "Rupture de stock");
    expect(cartButton).toBeDefined();
    expectResponsiveTouchTarget(cartButton!.className);
  });

  it("gives the WhatsApp icon button a 44px mobile height", () => {
    const whatsappButton = renderProps().find((p) => "productName" in p);
    expect(whatsappButton).toBeDefined();
    expectResponsiveTouchTarget(whatsappButton!.className);
  });

  it("gives the wishlist icon button a 44px mobile height", () => {
    const wishlistButton = renderProps().find(
      (p) => "productId" in p && !("productName" in p)
    );
    expect(wishlistButton).toBeDefined();
    expectResponsiveTouchTarget(wishlistButton!.className);
  });
});
