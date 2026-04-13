import { describe, it, expect, vi, beforeEach } from "vitest";
import { cartAdd, cartView, cartUpdate, cartRemove, cartClear } from "../../../../../workers/whatsapp/src/tools/cart";
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
    // 1. Product lookup
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1",
      name: "iPhone 15",
      base_price: 650000,
      stock_quantity: 10,
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
});

describe("cartView", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns cart items with subtotal", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          id: "ci1",
          product_name: "iPhone 15",
          variant_name: null,
          quantity: 2,
          unit_price: 650000,
        },
        {
          id: "ci2",
          product_name: "AirPods",
          variant_name: null,
          quantity: 1,
          unit_price: 150000,
        },
      ],
    });

    const result = await cartView(createMockCtx(mockDb));

    expect(result.success).toBe(true);
    const data = result.data as { items: unknown[]; subtotal: number };
    expect(data.items).toHaveLength(2);
    expect(data.subtotal).toBe(1450000); // 2*650000 + 1*150000
    expect(data.items[0]).toMatchObject({ name: "iPhone 15", quantity: 2, unit_price: 650000, total: 1300000 });
  });

  it("returns empty cart with zero subtotal", async () => {
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await cartView(createMockCtx(mockDb));

    expect(result.success).toBe(true);
    const data = result.data as { items: unknown[]; subtotal: number };
    expect(data.items).toHaveLength(0);
    expect(data.subtotal).toBe(0);
  });
});

describe("cartUpdate", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("updates item quantity", async () => {
    mockDb._statement.run.mockResolvedValueOnce({ success: true, meta: { changes: 1 } });

    const result = await cartUpdate(createMockCtx(mockDb), { item_id: "ci1", quantity: 3 });

    expect(result.success).toBe(true);
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
