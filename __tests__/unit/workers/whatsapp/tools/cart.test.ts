import { describe, it, expect, vi, beforeEach } from "vitest";
import { cartAdd, cartView, cartUpdate, cartRemove, cartClear } from "../../../../../workers/whatsapp/src/tools/cart";
// Asserted verbatim below. `resolveOrderLine` emits its own message containing
// "variante", so a /variante/i assertion cannot tell the stale-variant_id
// guard from the "pick a variant" rule, and would leave the former unpinned.
import { variantGoneFromCatalogue } from "../../../../../workers/whatsapp/src/tools/line-issues";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

function createMockD1() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
  };
}

function createMockCtx(mockDb: ReturnType<typeof createMockD1>): ToolContext {
  return {
    db: mockDb as unknown as D1Database,
    session: {
      id: "session-1",
      wa_phone: "2250700000000",
      user_id: null,
      pending_user_id: null,
      is_verified: 0,
      otp_code: null,
      otp_expires_at: null,
      status: "active" as const,
      created_at: "",
      updated_at: "",
    },
    env: {} as ToolContext["env"],
  };
}

describe("cartAdd", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("adds a product to the cart successfully", async () => {
    // 1. Product lookup — a product sold without variants
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "iPhone 15",
      base_price: 650000,
      stock_quantity: 10,
      active_variant_count: 0,
    });
    // 2. Existing cart item check — none
    mockDb._statement.first.mockResolvedValueOnce(null);
    // 3. INSERT run
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await cartAdd(createMockCtx(mockDb), { product_id: "p1", quantity: 2 });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ name: "iPhone 15", price: 650000, quantity: 2 });
  });

  it("returns error when product not found", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await cartAdd(createMockCtx(mockDb), { product_id: "nonexistent" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when stock is insufficient", async () => {
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "Rare Phone",
      base_price: 200000,
      stock_quantity: 1,
      active_variant_count: 0,
    });

    const result = await cartAdd(createMockCtx(mockDb), { product_id: "p1", quantity: 5 });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stock/i);
  });

  it("updates quantity when item already in cart", async () => {
    // Product lookup
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "Samsung TV",
      base_price: 300000,
      stock_quantity: 20,
      active_variant_count: 0,
    });
    // Existing cart item
    mockDb._statement.first.mockResolvedValueOnce({
      id: "cart-item-1",
      quantity: 1,
    });
    // UPDATE run
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await cartAdd(createMockCtx(mockDb), { product_id: "p1", quantity: 2 });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ name: "Samsung TV" });
  });

  it("validates variant belongs to product", async () => {
    // Product lookup
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "Laptop",
      base_price: 500000,
      stock_quantity: 5,
      active_variant_count: 3,
    });
    // Variant lookup — not found (wrong product)
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await cartAdd(createMockCtx(mockDb), {
      product_id: "p1",
      variant_id: "v-wrong",
      quantity: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/variant/i);
  });

  // ── Pricing invariant, enforced at cart entry ──
  //
  // `base_price` is the display figure for a product sold through variants
  // (the lowest variant price). Letting such a line into the cart would both
  // quote an unsellable price back in the conversation and produce a line the
  // order path must later reject — so refuse it here, at the earliest point.
  it("refuses a variant product added without a variant", async () => {
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "Climatiseur Split",
      base_price: 250000,
      stock_quantity: 10,
      active_variant_count: 2,
    });

    const result = await cartAdd(createMockCtx(mockDb), { product_id: "p1", quantity: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Veuillez sélectionner une variante pour Climatiseur Split");
    // Nothing may be written to whatsapp_carts.
    expect(mockDb._statement.run).not.toHaveBeenCalled();
  });

  it("adds a variant line at the variant price, not the product base price", async () => {
    // Product lookup
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "Climatiseur Split",
      base_price: 250000,
      stock_quantity: 10,
      active_variant_count: 2,
    });
    // Variant lookup
    mockDb._statement.first.mockResolvedValueOnce({
      id: "v2",
      name: "3 CV",
      price: 1400000,
      stock_quantity: 2,
    });
    // Existing cart item check — none
    mockDb._statement.first.mockResolvedValueOnce(null);
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await cartAdd(createMockCtx(mockDb), {
      product_id: "p1",
      variant_id: "v2",
      quantity: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ name: "Climatiseur Split – 3 CV", price: 1400000 });
  });
});

describe("cartView", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  /** A row as the cart-view query returns it, with orderable defaults. */
  function viewRow(overrides: Record<string, unknown>) {
    return {
      id: "ci1",
      product_name: "iPhone 15",
      base_price: 650000,
      product_stock: 10,
      product_is_active: 1,
      product_is_draft: 0,
      active_variant_count: 0,
      cart_variant_id: null,
      variant_id: null,
      variant_name: null,
      variant_price: null,
      variant_stock: null,
      quantity: 1,
      ...overrides,
    };
  }

  type ViewItem = {
    name: string;
    quantity: number;
    unit_price: number | null;
    total: number | null;
    issue: string | null;
  };
  type ViewData = { items: ViewItem[]; subtotal: number; has_blocking_issues: boolean };

  it("returns cart items with subtotal", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({ id: "ci1", product_name: "iPhone 15", base_price: 650000, quantity: 2 }),
        viewRow({ id: "ci2", product_name: "AirPods", base_price: 150000, quantity: 1 }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    expect(result.success).toBe(true);
    const data = result.data as ViewData;
    expect(data.items).toHaveLength(2);
    expect(data.subtotal).toBe(1450000); // 2*650000 + 1*150000
    expect(data.items[0]).toMatchObject({
      name: "iPhone 15",
      quantity: 2,
      unit_price: 650000,
      total: 1300000,
      issue: null,
    });
    expect(data.has_blocking_issues).toBe(false);
  });

  it("returns empty cart with zero subtotal", async () => {
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await cartView(createMockCtx(mockDb));

    expect(result.success).toBe(true);
    const data = result.data as ViewData;
    expect(data.items).toHaveLength(0);
    expect(data.subtotal).toBe(0);
    expect(data.has_blocking_issues).toBe(false);
  });

  it("prices a variant line from the variant", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({
          product_name: "Climatiseur Split",
          base_price: 250000,
          active_variant_count: 2,
          cart_variant_id: "v2",
          variant_id: "v2",
          variant_name: "3 CV",
          variant_price: 1400000,
          variant_stock: 5,
        }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    const data = result.data as ViewData;
    expect(data.items[0]).toMatchObject({
      name: "Climatiseur Split – 3 CV",
      unit_price: 1400000,
      total: 1400000,
      issue: null,
    });
    expect(data.subtotal).toBe(1400000);
  });

  // The view must not invent a figure the checkout will refuse: quoting an
  // unsellable base_price and then rejecting the order is what makes the
  // channel look untrustworthy.
  it("shows no price for a variant product line that carries no variant", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({
          product_name: "Climatiseur Split",
          base_price: 250000,
          active_variant_count: 2,
        }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    const data = result.data as ViewData;
    expect(data.items[0].unit_price).toBeNull();
    expect(data.items[0].total).toBeNull();
    // resolveOrderLine's rule, stated verbatim so it cannot be confused with
    // the stale-variant_id guard pinned in the two tests below.
    expect(data.items[0].issue).toBe("Veuillez sélectionner une variante pour Climatiseur Split");
    // Excluded from the subtotal, and the caller is told the cart is blocked.
    expect(data.subtotal).toBe(0);
    expect(data.has_blocking_issues).toBe(true);
  });

  // The LEFT JOIN carries `AND pv.product_id = wc.product_id AND pv.is_active = 1`,
  // so a retired variant and a variant belonging to another product reach this
  // code identically: cart_variant_id set, variant_id null. One test covers both
  // shapes here — unlike createOrder, where they take different branches.
  it("shows no price for a line whose chosen variant is no longer active", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({
          product_name: "Climatiseur Split",
          base_price: 250000,
          active_variant_count: 1,
          cart_variant_id: "v-retired",
          variant_id: null,
        }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    const data = result.data as ViewData;
    expect(data.items[0].unit_price).toBeNull();
    expect(data.items[0].issue).toBe(variantGoneFromCatalogue("Climatiseur Split"));
    expect(data.has_blocking_issues).toBe(true);
  });

  // The case where this guard is the only protection: with every variant
  // retired, active_variant_count is 0, so resolveOrderLine would happily
  // price the line at base_price. Nothing else stops it.
  it("shows no price for a stale variant when the product has no active variants left", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({
          product_name: "Climatiseur Split",
          base_price: 250000,
          active_variant_count: 0,
          cart_variant_id: "v-retired",
          variant_id: null,
          quantity: 1,
        }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    const data = result.data as ViewData;
    expect(data.items[0].unit_price).toBeNull();
    expect(data.items[0].total).toBeNull();
    expect(data.items[0].issue).toBe(variantGoneFromCatalogue("Climatiseur Split"));
    expect(data.subtotal).toBe(0);
    expect(data.has_blocking_issues).toBe(true);
  });

  it("flags a line whose product has left the catalogue", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({ product_name: "Ventilateur Retiré", product_is_active: 0 }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    const data = result.data as ViewData;
    expect(data.items[0].unit_price).toBeNull();
    expect(data.items[0].issue).toMatch(/catalogue/i);
    expect(data.subtotal).toBe(0);
    expect(data.has_blocking_issues).toBe(true);
  });

  // A line that is priceable but short on stock keeps its price: the customer
  // can act on it by lowering the quantity, so hiding the figure would remove
  // information rather than protect anyone.
  it("keeps the price of a line that is merely short on stock, but flags it", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        viewRow({ product_name: "Rare Phone", base_price: 200000, product_stock: 1, quantity: 5 }),
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    const data = result.data as ViewData;
    expect(data.items[0].unit_price).toBe(200000);
    expect(data.items[0].issue).toMatch(/stock/i);
    // Not orderable as it stands, so it does not count toward the subtotal.
    expect(data.subtotal).toBe(0);
    expect(data.has_blocking_issues).toBe(true);
  });
});

describe("cartUpdate", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("updates item quantity when stock is sufficient", async () => {
    // Stock lookup returns available stock
    mockDb._statement.first.mockResolvedValueOnce({ product_id: "p1", variant_id: null, available_stock: 10 });
    mockDb._statement.run.mockResolvedValueOnce({ success: true, meta: { changes: 1 } });

    const result = await cartUpdate(createMockCtx(mockDb), { item_id: "ci1", quantity: 3 });

    expect(result.success).toBe(true);
  });

  it("returns error when quantity exceeds stock", async () => {
    mockDb._statement.first.mockResolvedValueOnce({ product_id: "p1", variant_id: null, available_stock: 2 });

    const result = await cartUpdate(createMockCtx(mockDb), { item_id: "ci1", quantity: 5 });

    expect(result.success).toBe(false);
  });

  it("removes item when quantity is 0", async () => {
    mockDb._statement.run.mockResolvedValueOnce({ success: true, meta: { changes: 1 } });

    const result = await cartUpdate(createMockCtx(mockDb), { item_id: "ci1", quantity: 0 });

    expect(result.success).toBe(true);
    // DELETE should have been called (quantity <= 0 delegates to cartRemove)
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("DELETE"));
  });
});

describe("cartRemove", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("removes an item from the cart", async () => {
    mockDb._statement.run.mockResolvedValueOnce({ success: true, meta: { changes: 1 } });

    const result = await cartRemove(createMockCtx(mockDb), { item_id: "ci1" });

    expect(result.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("DELETE"));
  });
});

describe("cartClear", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("clears all items for the session", async () => {
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await cartClear(createMockCtx(mockDb));

    expect(result.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("DELETE"));
  });
});
