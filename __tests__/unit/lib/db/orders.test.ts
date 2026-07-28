import { describe, it, expect, vi, beforeEach } from "vitest";

// Exercises the guarded ->cancelled transition shared by the customer
// self-cancel path (cancelOrder), the stale-pending reaper
// (reapStalePendingOrders), and the admin cancel action's
// cancelOrderFromStatus, plus the concurrent-pending counter that backs the
// createOrder cap. Mocks @/lib/db (query/queryFirst/execute),
// @/lib/cloudflare/context (getDB, used only by refundOrderStock's batch
// stock update), and @/lib/notifications (the sweep's customer notification)
// rather than a real D1 binding or Resend call.

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryFirst: vi.fn(),
  execute: vi.fn(),
  dbBatch: vi.fn(),
  notifyOrderStatusUpdate: vi.fn(),
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
vi.mock("@/lib/notifications", () => ({
  notifyOrderStatusUpdate: mocks.notifyOrderStatusUpdate,
}));

import {
  cancelOrder,
  cancelOrderFromStatus,
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
    // The guard is parameterized (bound, not inlined) so it can be reused
    // with any fromStatus, not just 'pending' — see cancelOrderFromStatus.
    expect(mocks.execute.mock.calls[0][0]).toMatch(/AND status = \?/);
    expect(mocks.execute.mock.calls[0][1]).toEqual(["changed my mind", "order-1", "pending"]);
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
    expect(mocks.execute.mock.calls[1][0]).toMatch(/SET status = \?/);
    expect(mocks.execute.mock.calls[1][1]).toEqual(["pending", "order-1"]);
  });

  // The compensating revert is a second, independent D1 call, so it can fail
  // on its own — a failure the first refund-failure test never reaches. It
  // must collapse to the same `false` the contract already returns rather
  // than escaping as an unhandled rejection, and both errors must be logged
  // so the causal chain survives the boolean return.
  it("returns false instead of throwing when the compensating revert also fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.queryFirst.mockResolvedValue({ id: "order-1" });
    mocks.execute
      .mockResolvedValueOnce({ meta: { changes: 1 } })
      .mockRejectedValueOnce(new Error("D1 unavailable during revert"));
    mocks.query.mockResolvedValue([ITEM("order-1")]);
    mocks.dbBatch.mockRejectedValue(new Error("D1 batch failed"));

    await expect(cancelOrder("ORD-1", "user-1", "changed my mind")).resolves.toBe(false);

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    // refundOrderStock logs its own failure first, so select the compensation
    // log by content rather than by position.
    const call = errorSpy.mock.calls.find((c) => /revert also failed/i.test(String(c[0])));
    expect(call).toBeDefined();
    const [message, context, refundErr, revertErr] = call!;
    expect(message).toMatch(/revert also failed/i);
    expect(context).toMatchObject({ orderId: "order-1", intendedRevertTo: "pending" });
    expect(refundErr).toBeInstanceOf(Error);
    expect(revertErr).toBeInstanceOf(Error);
    errorSpy.mockRestore();
  });
});

describe("cancelOrderFromStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Proves the admin cancel path (actions/admin/orders.ts::cancelOrderAdmin)
  // gets the exact same race-safety as the customer/reaper path when it
  // cancels an order that was NOT pending (e.g. 'confirmed') — the guard is
  // not hardcoded to 'pending', it is parameterized on whatever fromStatus
  // the caller passed in.
  it("guards on an arbitrary fromStatus, not just 'pending'", async () => {
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.query.mockResolvedValue([ITEM("order-1")]);
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);

    const result = await cancelOrderFromStatus("order-1", "confirmed", "Rupture de stock");

    expect(result).toBe(true);
    expect(mocks.execute.mock.calls[0][1]).toEqual(["Rupture de stock", "order-1", "confirmed"]);
  });

  // This is the direct proof for the headline race: if an admin reads an
  // order as 'confirmed' but the row was already flipped away from that
  // status by the time the guarded UPDATE runs (e.g. the sweep cancelled the
  // *pending* order underneath a stale admin read, or another admin tab beat
  // this one to it), the guard must reject rather than silently cancelling
  // and refunding a row this call never actually transitioned. Without the
  // "AND status = ?" predicate (the pre-fix behavior), this UPDATE would run
  // unconditionally and refundOrderStock would be called regardless.
  it("does not refund when a concurrent caller already changed the row's status away from fromStatus", async () => {
    mocks.execute.mockResolvedValue({ meta: { changes: 0 } });

    const result = await cancelOrderFromStatus("order-1", "confirmed", "Rupture de stock");

    expect(result).toBe(false);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.dbBatch).not.toHaveBeenCalled();
  });

  // Backs the admin "cancel without refund" option (cancelOrderAdmin's
  // refundStock=false): the guard still runs, but refundOrderStock must
  // never be invoked at all when the caller opts out.
  it("skips refundOrderStock entirely when refund: false", async () => {
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });

    const result = await cancelOrderFromStatus("order-1", "pending", "Doublon", { refund: false });

    expect(result).toBe(true);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.dbBatch).not.toHaveBeenCalled();
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

  it("notifies the customer after auto-cancelling their stale order", async () => {
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM orders WHERE status = 'pending'")) {
        return [{ id: "order-1", order_number: "ORD-ABC123", user_id: "user-1" }];
      }
      if (sql.includes("FROM order_items WHERE order_id = ?")) {
        return [ITEM(params[0] as string)];
      }
      return [];
    });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);
    mocks.queryFirst.mockResolvedValue({ email: "client@example.com", name: "Awa" });
    mocks.notifyOrderStatusUpdate.mockResolvedValue(undefined);

    const result = await reapStalePendingOrders(24);

    expect(result).toEqual({ cancelled: 1, skipped: 0, total: 1, hasMore: false });
    expect(mocks.queryFirst).toHaveBeenCalledWith(
      "SELECT email, name FROM user WHERE id = ?",
      ["user-1"]
    );
    expect(mocks.notifyOrderStatusUpdate).toHaveBeenCalledWith(
      "client@example.com",
      expect.objectContaining({
        customerName: "Awa",
        orderNumber: "ORD-ABC123",
        newStatus: "cancelled",
      })
    );
  });

  // The headline requirement for the customer-notification fix: a send
  // failure must be visible only as a log line, never as a change to the
  // cancelled/skipped tally, and it must not stop the sweep from reaching
  // the next order in the same batch.
  it("does not let a notification failure change the tally or abort the rest of the batch", async () => {
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM orders WHERE status = 'pending'")) {
        return [
          { id: "order-1", order_number: "ORD-1", user_id: "user-1" },
          { id: "order-2", order_number: "ORD-2", user_id: "user-2" },
        ];
      }
      if (sql.includes("FROM order_items WHERE order_id = ?")) {
        return [ITEM(params[0] as string)];
      }
      return [];
    });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.dbBatch.mockResolvedValue([{ meta: { changes: 1 } }]);
    // Every attempt to look up the customer (or send the email) fails.
    mocks.queryFirst.mockRejectedValue(new Error("D1 unavailable"));

    const result = await reapStalePendingOrders(24);

    // Both orders still count as cancelled — the refund already committed
    // and is entirely independent of whether the courtesy email went out.
    expect(result).toEqual({ cancelled: 2, skipped: 0, total: 2, hasMore: false });
    expect(mocks.dbBatch).toHaveBeenCalledTimes(2);
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

  it("deletes the reserved order row when the batch itself throws, leaving no phantom pending order", async () => {
    // The reservation (step 0) committed the order row on its own, separate
    // execute() call, before db.batch ever runs. If that batch throws — a
    // transient D1 error, a constraint failure — db.batch's own implicit
    // transaction rolls back the stock decrements and item inserts, but
    // nothing automatically undoes the already-committed order row. Without
    // the fix, this order would survive as `pending`, with a real total and
    // order_number but zero items, holding a concurrent-pending-cap slot
    // until the reaper cancels it.
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } }); // reservation succeeds
    mocks.dbBatch.mockRejectedValue(new Error("D1 unavailable"));

    await expect(createOrderWithItems(orderData, items)).rejects.toThrow(/création de la commande/i);

    // First execute = the reservation INSERT, second = the cleanup DELETE.
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.execute.mock.calls[1][0]).toMatch(/DELETE FROM orders WHERE id = \?/);
  });
});
