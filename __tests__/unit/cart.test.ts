import { describe, it, expect } from "vitest";
import { cartItemKey } from "@/lib/types/cart";

describe("cartItemKey", () => {
  it("génère la clé avec un variantId", () => {
    expect(
      cartItemKey({ productId: "prod-1", variantId: "var-1" })
    ).toBe("prod-1:var-1");
  });

  it("utilise 'default' quand variantId est null", () => {
    expect(
      cartItemKey({ productId: "prod-1", variantId: null })
    ).toBe("prod-1:default");
  });

  it("génère des clés différentes pour des variantes différentes", () => {
    const key1 = cartItemKey({ productId: "prod-1", variantId: "var-1" });
    const key2 = cartItemKey({ productId: "prod-1", variantId: "var-2" });
    expect(key1).not.toBe(key2);
  });

  it("génère des clés différentes pour des produits différents", () => {
    const key1 = cartItemKey({ productId: "prod-1", variantId: null });
    const key2 = cartItemKey({ productId: "prod-2", variantId: null });
    expect(key1).not.toBe(key2);
  });
});
