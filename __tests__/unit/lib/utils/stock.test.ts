import { describe, it, expect } from "vitest";
import {
  buildStockDecrement,
  buildStockRestore,
  stockUpdateApplied,
} from "@/lib/utils/stock";

// These statements are shared by the web checkout (lib/db/orders.ts) and the
// WhatsApp Worker (workers/whatsapp/src/tools/orders.ts). Pinning their shape
// here is what keeps the two from drifting apart again.

describe("buildStockDecrement", () => {
  it("guards a product decrement on the stock still being there", () => {
    const { sql, params } = buildStockDecrement({
      productId: "p1",
      variantId: null,
      quantity: 3,
    });

    expect(sql).toContain("UPDATE products");
    expect(sql).toContain("AND stock_quantity >= ?");
    // The quantity is bound twice on purpose: the availability check and the
    // write are the same statement, so two orders for the last unit cannot
    // both pass the check.
    expect(params).toEqual([3, "p1", 3]);
  });

  it("guards a variant decrement and targets the variant row", () => {
    const { sql, params } = buildStockDecrement({
      productId: "p1",
      variantId: "v1",
      quantity: 2,
    });

    expect(sql).toContain("UPDATE product_variants");
    expect(sql).toContain("AND stock_quantity >= ?");
    expect(params).toEqual([2, "v1", 2]);
    // Never the parent product row — that stock is a different figure.
    expect(params).not.toContain("p1");
  });
});

describe("buildStockRestore", () => {
  it("adds the quantity back to the product row", () => {
    const { sql, params } = buildStockRestore({
      productId: "p1",
      variantId: null,
      quantity: 3,
    });

    expect(sql).toContain("UPDATE products");
    expect(sql).toContain("stock_quantity + ?");
    expect(params).toEqual([3, "p1"]);
  });

  it("adds the quantity back to the variant row", () => {
    const { sql, params } = buildStockRestore({
      productId: "p1",
      variantId: "v1",
      quantity: 2,
    });

    expect(sql).toContain("UPDATE product_variants");
    expect(params).toEqual([2, "v1"]);
  });

  it("carries no availability guard — a release can never go negative", () => {
    const { sql } = buildStockRestore({ productId: "p1", variantId: null, quantity: 1 });
    expect(sql).not.toContain(">=");
  });
});

describe("stockUpdateApplied", () => {
  it("accepts an update that affected a row", () => {
    expect(stockUpdateApplied({ meta: { changes: 1 } })).toBe(true);
  });

  it("rejects an update that matched nothing", () => {
    expect(stockUpdateApplied({ meta: { changes: 0 } })).toBe(false);
  });

  it("rejects a missing result rather than reading it as success", () => {
    // Fail closed: a driver returning fewer results than statements must not
    // be mistaken for "every decrement applied".
    expect(stockUpdateApplied(undefined)).toBe(false);
  });
});
