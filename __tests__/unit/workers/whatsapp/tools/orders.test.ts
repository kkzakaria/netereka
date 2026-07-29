import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOrder,
  getOrderStatus,
  listOrders,
} from "../../../../../workers/whatsapp/src/tools/orders";
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
    batch: vi.fn().mockResolvedValue([]),
    _statement: mockStatement,
  };
}

function createMockCtx(
  mockDb: ReturnType<typeof createMockD1>,
  userId: string | null = "user-1",
  isVerified: 0 | 1 = 1
): ToolContext {
  return {
    db: mockDb as unknown as D1Database,
    session: {
      id: "session-1",
      wa_phone: "2250700000000",
      user_id: userId,
      pending_user_id: null,
      is_verified: isVerified,
      otp_code: null,
      otp_expires_at: null,
      status: "active" as const,
      created_at: "",
      updated_at: "",
    },
    env: {} as ToolContext["env"],
  };
}

// ─── createOrder ──────────────────────────────────────────────────────────────

describe("createOrder", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns error if session has no linked user", async () => {
    const ctx = createMockCtx(mockDb, null);

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/link/i);
  });

  // Security regression: a session that carries a user_id but is NOT verified
  // (the state produced by linkAccount before OTP) must be refused. Gating on
  // user_id alone was the OTP-bypass vuln (GHSA).
  it("refuses an unverified session even when user_id is present", async () => {
    const ctx = createMockCtx(mockDb, "victim-999", 0);

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/link/i);
    // Must short-circuit before touching the DB.
    expect(mockDb.prepare).not.toHaveBeenCalled();
  });

  it("returns error if cart is empty", async () => {
    const ctx = createMockCtx(mockDb);

    // Cart query returns empty
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cart/i);
  });

  it("returns error if delivery zone not found for commune", async () => {
    const ctx = createMockCtx(mockDb);

    // 1. Cart items
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "iPhone 15",
          base_price: 650000,
          product_stock: 10,
          quantity: 1,
        },
      ],
    });
    // 2. Active variants for the cart's products — none
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });
    // 3. Delivery zone not found
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Unknown",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/delivery zone/i);
  });

  it("returns error if any item has insufficient stock", async () => {
    const ctx = createMockCtx(mockDb);

    // 1. Cart items — product_stock < quantity
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "Rare Phone",
          base_price: 200000,
          product_stock: 2,
          quantity: 5,
        },
      ],
    });
    // 2. Active variants — none
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stock/i);
  });

  // Non-regression: a product sold without variants must still be orderable
  // at its base_price — the guard below must not break the ordinary path.
  it("creates an order successfully and returns confirmation", async () => {
    const ctx = createMockCtx(mockDb);

    // 1. Cart items
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "iPhone 15",
          base_price: 650000,
          product_stock: 10,
          quantity: 2,
        },
      ],
    });
    // 2. Active variants — this product has none
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });
    // 3. Delivery zone
    mockDb._statement.first.mockResolvedValueOnce({
      id: "zone-1",
      fee: 2000,
      estimated_hours: 24,
    });
    // batch succeeds
    mockDb.batch.mockResolvedValueOnce([]);

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(true);
    const data = result.data as {
      order_number: string;
      subtotal: number;
      delivery_fee: number;
      total: number;
    };
    expect(data.order_number).toMatch(/^ORD-[A-Z0-9]{6}$/);
    expect(data.subtotal).toBe(1300000); // 2 * 650000
    expect(data.delivery_fee).toBe(2000);
    expect(data.total).toBe(1302000);
    // batch should have been called once with multiple statements
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  // ── Pricing invariant (shared with the web checkout via resolveOrderLine) ──

  // `base_price` is a display figure for a product sold through variants (the
  // lowest variant price), not a sellable price. A cart line on such a product
  // that carries no variant must stop the order, not fall back to base_price.
  it("refuses a cart line on a variant product that carries no variant", async () => {
    const ctx = createMockCtx(mockDb);

    // 1. Cart items — no variant_id on a product that is sold through variants.
    //    `unit_price`/`stock_quantity` are the columns the pre-hardening query
    //    produced (COALESCE(pv.price, p.base_price)); they are kept here so the
    //    test reproduces exactly the state that used to bill at base_price.
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          quantity: 1,
          unit_price: 250000,
          stock_quantity: 10,
        },
      ],
    });
    // 2. Active variants — the product has two, so a null variant is not a
    //    valid line.
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v1", product_id: "p1", name: "1.5 CV", price: 250000, stock_quantity: 4 },
        { id: "v2", product_id: "p1", name: "3 CV", price: 1400000, stock_quantity: 2 },
      ],
    });
    // Delivery zone would resolve, if we ever got that far.
    mockDb._statement.first.mockResolvedValueOnce({
      id: "zone-1",
      fee: 2000,
      estimated_hours: 24,
    });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/variante/i);
    expect(result.error).toContain("Climatiseur Split");
    // Nothing may be written: no order, no order_item at base_price.
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("bills a variant line at the variant price, never at the product base price", async () => {
    const ctx = createMockCtx(mockDb);

    // 1. Cart items — variant explicitly chosen
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: "v2",
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          quantity: 1,
        },
      ],
    });
    // 2. Active variants
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v1", product_id: "p1", name: "1.5 CV", price: 250000, stock_quantity: 4 },
        { id: "v2", product_id: "p1", name: "3 CV", price: 1400000, stock_quantity: 2 },
      ],
    });
    // 3. Delivery zone
    mockDb._statement.first.mockResolvedValueOnce({
      id: "zone-1",
      fee: 2000,
      estimated_hours: 24,
    });
    mockDb.batch.mockResolvedValueOnce([]);

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(true);
    const data = result.data as { subtotal: number; total: number };
    expect(data.subtotal).toBe(1400000); // variant price, not the 250000 base
    expect(data.total).toBe(1402000);
  });

  it("refuses a cart line whose variant is no longer active", async () => {
    const ctx = createMockCtx(mockDb);

    // 1. Cart items — references a variant that has since been deactivated
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: "v-retired",
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          quantity: 1,
        },
      ],
    });
    // 2. Active variants — v-retired is absent
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v1", product_id: "p1", name: "1.5 CV", price: 250000, stock_quantity: 4 },
      ],
    });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/variante/i);
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("refuses a cart line whose variant belongs to another product", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: "v-other",
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          quantity: 1,
        },
      ],
    });
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v-other", product_id: "p2", name: "Autre", price: 1, stock_quantity: 99 },
      ],
    });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(mockDb.batch).not.toHaveBeenCalled();
  });
});

// ─── getOrderStatus ───────────────────────────────────────────────────────────

describe("getOrderStatus", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns order details when order is found", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.first.mockResolvedValueOnce({
      id: "order-1",
      order_number: "ORD-ABC123",
      status: "pending",
      total: 1302000,
      created_at: "2026-04-13T10:00:00Z",
      estimated_delivery: "2026-04-14T10:00:00Z",
    });

    const result = await getOrderStatus(ctx, { order_number: "ORD-ABC123" });

    expect(result.success).toBe(true);
    const data = result.data as { order_number: string; status: string; total: number };
    expect(data.order_number).toBe("ORD-ABC123");
    expect(data.status).toBe("pending");
    expect(data.total).toBe(1302000);
  });

  it("returns error when order not found", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await getOrderStatus(ctx, { order_number: "ORD-NOTFOUND" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error if user is not linked", async () => {
    const ctx = createMockCtx(mockDb, null);

    const result = await getOrderStatus(ctx, { order_number: "ORD-ABC123" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/link/i);
  });

  it("refuses an unverified session even when user_id is present", async () => {
    const ctx = createMockCtx(mockDb, "victim-999", 0);

    const result = await getOrderStatus(ctx, { order_number: "ORD-ABC123" });

    expect(result.success).toBe(false);
    expect(mockDb.prepare).not.toHaveBeenCalled();
  });
});

// ─── listOrders ───────────────────────────────────────────────────────────────

describe("listOrders", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns error if user is not linked", async () => {
    const ctx = createMockCtx(mockDb, null);

    const result = await listOrders(ctx, {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/link/i);
  });

  it("refuses an unverified session even when user_id is present", async () => {
    const ctx = createMockCtx(mockDb, "victim-999", 0);

    const result = await listOrders(ctx, {});

    expect(result.success).toBe(false);
    expect(mockDb.prepare).not.toHaveBeenCalled();
  });

  it("returns list of recent orders", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          order_number: "ORD-ABC123",
          status: "delivered",
          total: 1302000,
          created_at: "2026-04-13T10:00:00Z",
        },
        {
          order_number: "ORD-DEF456",
          status: "pending",
          total: 50000,
          created_at: "2026-04-12T08:00:00Z",
        },
      ],
    });

    const result = await listOrders(ctx, {});

    expect(result.success).toBe(true);
    const data = result.data as { orders: unknown[]; count: number };
    expect(data.orders).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(data.orders[0]).toMatchObject({
      order_number: "ORD-ABC123",
      status: "delivered",
      total: 1302000,
    });
  });

  it("returns empty list when user has no orders", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await listOrders(ctx, {});

    expect(result.success).toBe(true);
    const data = result.data as { orders: unknown[]; count: number };
    expect(data.orders).toHaveLength(0);
    expect(data.count).toBe(0);
  });

  it("caps the limit at 10", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    await listOrders(ctx, { limit: 50 });

    // The SQL should be called with limit capped to 10
    expect(mockDb._statement.bind).toHaveBeenCalledWith("user-1", 10);
  });
});
