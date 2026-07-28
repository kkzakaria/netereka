import { describe, it, expect, vi, beforeEach } from "vitest";

// Exercises the guarded pending->cancelled transition shared by the customer
// self-cancel path (cancelOrder) and the stale-pending reaper
// (reapStalePendingOrders), plus the concurrent-pending counter that backs
// the createOrder cap. Mocks @/lib/db (query/queryFirst/execute) and
// @/lib/cloudflare/context (getDB, used only by refundOrderStock's batch
// stock update) rather than a real D1 binding.

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryFirst: vi.fn(),
  execute: vi.fn(),
  dbBatch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: mocks.query,
  queryFirst: mocks.queryFirst,
  execute: mocks.execute,
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: vi.fn().mockResolvedValue({
    // refundOrderStock builds each stock-update statement via db.prepare(...).bind(...)
    // before handing the array to db.batch(...) — both must be stubbed.
    prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({}) }),
    batch: mocks.dbBatch,
  }),
}));

import {
  cancelOrder,
  countPendingOrdersForUser,
  reapStalePendingOrders,
  createOrderWithItems,
} from "@/lib/db/orders";

const ITEM = (orderId: string) => ({
  id: `item-${orderId}`,
  order_id: orderId,
  product_id: "prod-1",
  variant_id: null,
  product_name: "Casque",
  variant_name: null,
  quantity: 1,
  unit_price: 1000,
  total_price: 1000,
});

describe("cancelOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no matching pending order is owned by the user", async () => {
    mocks.queryFirst.mockResolvedValue(null);

    const result = await cancelOrder("ORD-1", "user-1", "changed my mind");

    expect(result).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("cancels the order and refunds stock exactly once", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "order-1" });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.query.mockResolvedValue([ITEM("order-1")]);
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);

    const result = await cancelOrder("ORD-1", "user-1", "changed my mind");

    expect(result).toBe(true);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.execute.mock.calls[0][0]).toMatch(/status = 'cancelled'/);
    expect(mocks.execute.mock.calls[0][0]).toMatch(/AND status = 'pending'/);
    expect(mocks.dbBatch).toHaveBeenCalledTimes(1);
  });

  it("does not refund when the guarded UPDATE affects no rows (already cancelled concurrently)", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "order-1" });
    mocks.execute.mockResolvedValue({ meta: { changes: 0 } });

    const result = await cancelOrder("ORD-1", "user-1", "changed my mind");

    expect(result).toBe(false);
    // Only the cancelling UPDATE ran — refundOrderStock (query for items,
    // then dbBatch) was never reached because changes === 0 short-circuits.
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.dbBatch).not.toHaveBeenCalled();
  });

  it("reverts to pending if the refund throws, and does not report success", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "order-1" });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.query.mockResolvedValue([ITEM("order-1")]);
    mocks.dbBatch.mockRejectedValue(new Error("D1 batch failed"));

    const result = await cancelOrder("ORD-1", "user-1", "changed my mind");

    expect(result).toBe(false);
    // First execute = the cancel UPDATE, second = the compensating revert.
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.execute.mock.calls[1][0]).toMatch(/status = 'pending'/);
  });
});

describe("countPendingOrdersForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the pending count for the user", async () => {
    mocks.queryFirst.mockResolvedValue({ total: 3 });
    expect(await countPendingOrdersForUser("user-1")).toBe(3);
  });

  it("returns 0 when there is no row", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    expect(await countPendingOrdersForUser("user-1")).toBe(0);
  });
});

describe("reapStalePendingOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels every stale pending order and refunds stock for each", async () => {
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM orders WHERE status = 'pending'")) {
        return [{ id: "order-1" }, { id: "order-2" }];
      }
      if (sql.includes("FROM order_items WHERE order_id = ?")) {
        return [ITEM(params[0] as string)];
      }
      return [];
    });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);

    const result = await reapStalePendingOrders(24);

    expect(result).toEqual({ cancelled: 2, skipped: 0, total: 2, hasMore: false });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.dbBatch).toHaveBeenCalledTimes(2);
  });

  it("does not double-refund an order a concurrent customer cancellation already claimed", async () => {
    // order-2's guarded UPDATE affects 0 rows: by the time the reaper reaches
    // it, a concurrent customer cancel already flipped it away from
    // 'pending'. The reaper must skip the refund for that order entirely.
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM orders WHERE status = 'pending'")) {
        return [{ id: "order-1" }, { id: "order-2" }];
      }
      if (sql.includes("FROM order_items WHERE order_id = ?")) {
        return [ITEM(params[0] as string)];
      }
      return [];
    });
    mocks.execute.mockImplementation(async (_sql: string, params: unknown[] = []) => {
      const orderId = params[1];
      return { meta: { changes: orderId === "order-2" ? 0 : 1 } };
    });
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);

    const result = await reapStalePendingOrders(24);

    expect(result).toEqual({ cancelled: 1, skipped: 1, total: 2, hasMore: false });
    // Refund (dbBatch) only ran for order-1 — order-2 was never touched.
    expect(mocks.dbBatch).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts when there are no stale pending orders", async () => {
    mocks.query.mockResolvedValue([]);

    const result = await reapStalePendingOrders(24);

    expect(result).toEqual({ cancelled: 0, skipped: 0, total: 0, hasMore: false });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("caps a run at batchSize and reports hasMore when the backlog is larger", async () => {
    // 5 stale orders exist, but the caller only wants batches of 2 at a time.
    // The SELECT is mocked to honor LIMIT (batchSize + 1 = 3 rows back),
    // exactly like the real "ORDER BY created_at ASC LIMIT ?" query would.
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM orders WHERE status = 'pending'")) {
        return [{ id: "order-1" }, { id: "order-2" }, { id: "order-3" }].slice(0, 3);
      }
      if (sql.includes("FROM order_items WHERE order_id = ?")) {
        return [ITEM("order-x")];
      }
      return [];
    });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);

    const result = await reapStalePendingOrders(24, 2);

    // Only 2 of the 3 rows returned by the (LIMIT batchSize+1) query are
    // actually processed; the 3rd's presence is what signals hasMore.
    expect(result).toEqual({ cancelled: 2, skipped: 0, total: 2, hasMore: true });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("tallies an unexpected per-order failure as skipped instead of aborting the rest of the sweep", async () => {
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM orders WHERE status = 'pending'")) {
        return [{ id: "order-1" }, { id: "order-2" }];
      }
      if (sql.includes("FROM order_items WHERE order_id = ?")) {
        return [ITEM(params[0] as string)];
      }
      return [];
    });
    // order-1's guarded UPDATE itself throws (e.g. a transient D1 error) —
    // not a refund failure, a failure in cancelPendingOrderById's own guard
    // statement. order-2 must still be processed normally.
    mocks.execute.mockImplementation(async (_sql: string, params: unknown[] = []) => {
      if (params[1] === "order-1") throw new Error("transient D1 error");
      return { meta: { changes: 1 } };
    });
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);

    const result = await reapStalePendingOrders(24);

    expect(result).toEqual({ cancelled: 1, skipped: 1, total: 2, hasMore: false });
  });
});

describe("createOrderWithItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const orderData = {
    userId: "user-1",
    orderNumber: "ORD-TEST01",
    subtotal: 10000,
    deliveryFee: 1000,
    discountAmount: 0,
    total: 11000,
    promoCodeId: null,
    deliveryAddress: "Rue des Jardins, Plateau, Abidjan",
    deliveryCommune: "Plateau",
    deliveryPhone: "0102030405",
    deliveryInstructions: null,
    estimatedDelivery: null,
  };

  const items = [
    {
      productId: "prod-1",
      variantId: null,
      productName: "Casque",
      variantName: null,
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
    },
  ];

  it("reserves the order atomically, then decrements stock and inserts items", async () => {
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } }); // reservation guard passes
    mocks.dbBatch.mockResolvedValue([
      { meta: { changes: 1 } }, // stock decrement
      { meta: { changes: 1 } }, // order_items insert
    ]);

    const result = await createOrderWithItems(orderData, items);

    expect(result.orderNumber).toBe("ORD-TEST01");
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.execute.mock.calls[0][0]).toMatch(/INSERT INTO orders/);
    expect(mocks.execute.mock.calls[0][0]).toMatch(/WHERE \(SELECT COUNT\(\*\) FROM orders/);
    // The order row itself is no longer part of the stock/items batch.
    expect(mocks.dbBatch).toHaveBeenCalledTimes(1);
    expect(mocks.dbBatch.mock.calls[0][0]).toHaveLength(2);
  });

  it("throws and touches neither stock nor items when the concurrent-pending cap guard blocks the reservation", async () => {
    // This is the burst-safety property: the guard and the write are the
    // same statement, so a race can only ever produce changes: 0 here — it
    // cannot let stock or order_items get touched on a blocked reservation.
    mocks.execute.mockResolvedValue({ meta: { changes: 0 } });

    await expect(createOrderWithItems(orderData, items)).rejects.toThrow(/attente/i);

    expect(mocks.dbBatch).not.toHaveBeenCalled();
  });

  it("still rolls back the reserved order when a later stock decrement fails", async () => {
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } }); // reservation succeeds
    mocks.dbBatch
      .mockResolvedValueOnce([{ meta: { changes: 0 } }, { meta: { changes: 1 } }]) // stock decrement fails
      .mockResolvedValueOnce([{ meta: { changes: 1 } }]); // rollback batch (delete order + items, restore stock)

    await expect(createOrderWithItems(orderData, items)).rejects.toThrow(/Stock insuffisant/);

    // First call attempted the write, second call is the rollback — the
    // order row created by the reservation is what gets deleted there.
    expect(mocks.dbBatch).toHaveBeenCalledTimes(2);
  });
});
