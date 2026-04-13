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
  userId: string | null = "user-1"
): ToolContext {
  return {
    db: mockDb as unknown as D1Database,
    session: {
      id: "session-1",
      wa_phone: "2250700000000",
      user_id: userId,
      is_verified: 1,
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

    // Cart items
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "iPhone 15",
          variant_name: null,
          quantity: 1,
          unit_price: 650000,
          stock_quantity: 10,
        },
      ],
    });
    // Delivery zone not found
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

    // Cart items — stock_quantity < quantity
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "Rare Phone",
          variant_name: null,
          quantity: 5,
          unit_price: 200000,
          stock_quantity: 2,
        },
      ],
    });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stock/i);
  });

  it("creates an order successfully and returns confirmation", async () => {
    const ctx = createMockCtx(mockDb);

    // Cart items
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "iPhone 15",
          variant_name: null,
          quantity: 2,
          unit_price: 650000,
          stock_quantity: 10,
        },
      ],
    });
    // Delivery zone
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
