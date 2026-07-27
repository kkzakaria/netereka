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

import { cancelOrder, countPendingOrdersForUser, reapStalePendingOrders } from "@/lib/db/orders";

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

    expect(result).toEqual({ cancelled: 2, skipped: 0, total: 2 });
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

    expect(result).toEqual({ cancelled: 1, skipped: 1, total: 2 });
    // Refund (dbBatch) only ran for order-1 — order-2 was never touched.
    expect(mocks.dbBatch).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts when there are no stale pending orders", async () => {
    mocks.query.mockResolvedValue([]);

    const result = await reapStalePendingOrders(24);

    expect(result).toEqual({ cancelled: 0, skipped: 0, total: 0 });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
