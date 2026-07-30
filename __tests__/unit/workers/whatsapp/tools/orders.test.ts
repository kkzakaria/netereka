import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOrder,
  getOrderStatus,
  listOrders,
} from "../../../../../workers/whatsapp/src/tools/orders";
// Asserted verbatim below, on purpose. `resolveOrderLine` also emits a message
// containing "variante" ("Veuillez sélectionner une variante pour …"), so a
// /variante/i assertion passes whichever of the two rules fired — and the
// stale-variant_id guard would go unpinned.
import { variantGoneFromCatalogue } from "../../../../../workers/whatsapp/src/tools/line-issues";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

/**
 * A statement as it was actually prepared and bound. `createOrder` now has to
 * be judged on *which* SQL it sends and in which batch, not merely on how many
 * times it called `batch()`, so each prepared statement carries its own text
 * and parameters instead of every call returning one shared spy.
 */
interface RecordedStatement {
  sql: string;
  params: unknown[];
  bind: (...args: unknown[]) => RecordedStatement;
  first: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown;
}

function createMockD1() {
  // Kept as a single spy so the existing per-call expectations
  // (`_statement.all.mockResolvedValueOnce`, `_statement.bind` assertions)
  // keep working: every recorded statement delegates its terminal methods here.
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  const prepared: RecordedStatement[] = [];
  const prepare = vi.fn((sql: string) => {
    const stmt: RecordedStatement = {
      sql,
      params: [],
      bind(...args: unknown[]) {
        stmt.params = args;
        mockStatement.bind(...args);
        return stmt;
      },
      first: (...args: unknown[]) => mockStatement.first(...args),
      run: (...args: unknown[]) => mockStatement.run(...args),
      all: (...args: unknown[]) => mockStatement.all(...args),
    };
    prepared.push(stmt);
    return stmt;
  });
  return {
    prepare,
    // Default: every statement in the batch reports one affected row. A batch
    // that returned `[]` used to be accepted because nothing read the result.
    batch: vi.fn(async (stmts: RecordedStatement[]) => stmts.map(() => ({ meta: { changes: 1 } }))),
    _statement: mockStatement,
    _prepared: prepared,
  };
}

/** The statements handed to the n-th `batch()` call (0-indexed). */
function batchStatements(
  mockDb: ReturnType<typeof createMockD1>,
  n: number
): RecordedStatement[] {
  return (mockDb.batch.mock.calls[n]?.[0] ?? []) as RecordedStatement[];
}

/** Every statement prepared during the call, across all batches and singles. */
function preparedSql(mockDb: ReturnType<typeof createMockD1>): string {
  return mockDb._prepared.map((s) => s.sql).join("\n");
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

/**
 * Every privileged order tool now opens with an authoritative ban read
 * (`requireActiveCustomer`). Queueing its answer first, before each test adds
 * its own rows, keeps the `mockResolvedValueOnce` sequences below in step.
 */
function primeActiveAccount(mockDb: ReturnType<typeof createMockD1>) {
  mockDb._statement.first.mockResolvedValueOnce({ banned: 0, banExpires: null });
}

/** A ban with no expiry: indefinite. */
function primeBannedAccount(mockDb: ReturnType<typeof createMockD1>) {
  mockDb._statement.first.mockResolvedValueOnce({ banned: 1, banExpires: null });
}

// ─── createOrder ──────────────────────────────────────────────────────────────

describe("createOrder", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    primeActiveAccount(mockDb);
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

  // A session linked before the ban stays `is_verified = 1` forever — nothing
  // in this Worker revisits it. The ban therefore has to be re-read here, or
  // the bot channel keeps serving an account the shop has suspended.
  it("refuses a suspended account and writes nothing", async () => {
    mockDb = createMockD1();
    primeBannedAccount(mockDb);
    const ctx = createMockCtx(mockDb);

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/suspendu/i);
    // Refused before the cart is even read: no stock taken, no order row.
    expect(mockDb.batch).not.toHaveBeenCalled();
    expect(preparedSql(mockDb)).not.toMatch(/INSERT INTO orders/i);
  });

  it("still serves an account whose ban has expired", async () => {
    mockDb = createMockD1();
    mockDb._statement.first.mockResolvedValueOnce({
      banned: 1,
      banExpires: new Date(Date.now() - 60_000).toISOString(),
    });
    const ctx = createMockCtx(mockDb);
    mockDb._statement.all.mockResolvedValueOnce({ results: [] }); // empty cart

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    // Refused for the cart, not for the lapsed sanction.
    expect(result.error).toMatch(/cart/i);
    expect(result.error).not.toMatch(/suspendu/i);
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
          product_is_active: 1,
          product_is_draft: 0,
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
          product_is_active: 1,
          product_is_draft: 0,
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
          product_is_active: 1,
          product_is_draft: 0,
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
    // Two batches: the stock reservation, then the order write. Both must have
    // actually run — the order is only confirmed once its stock is held.
    expect(mockDb.batch).toHaveBeenCalledTimes(2);
    expect(batchStatements(mockDb, 0)).toHaveLength(1);
    expect(batchStatements(mockDb, 0)[0].sql).toContain("stock_quantity - ?");
    const written = batchStatements(mockDb, 1)
      .map((s) => s.sql)
      .join("\n");
    expect(written).toContain("INSERT INTO orders");
    expect(written).toContain("INSERT INTO order_items");
    expect(written).toContain("DELETE FROM whatsapp_carts");
    // Nothing was put back.
    expect(preparedSql(mockDb)).not.toContain("stock_quantity + ?");
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
          product_is_active: 1,
          product_is_draft: 0,
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
    // This is resolveOrderLine's rule, not the stale-variant guard: assert its
    // own wording so the two cannot stand in for each other.
    expect(result.error).toBe("Veuillez sélectionner une variante pour Climatiseur Split");
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
          product_is_active: 1,
          product_is_draft: 0,
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
          product_is_active: 1,
          product_is_draft: 0,
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
    expect(result.error).toBe(variantGoneFromCatalogue("Climatiseur Split"));
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  // The case where the stale-variant_id guard is the ONLY protection. With
  // every variant retired, activeVariantCount is 0, so resolveOrderLine's
  // "you must pick a variant" rule is inapplicable by construction and stops
  // covering for it: nothing else stands between a stale variant_id and a sale
  // at base_price.
  it("refuses a stale variant_id even when the product has no active variants left", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: "v-retired",
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          product_is_active: 1,
          product_is_draft: 0,
          quantity: 1,
        },
      ],
    });
    // 2. Every variant of this product has been retired.
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });
    // A zone is primed so that reaching the delivery lookup cannot be mistaken
    // for a refusal: if the guard stops working, the order goes through.
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
    expect(result.error).toBe(variantGoneFromCatalogue("Climatiseur Split"));
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  // ── Catalogue availability ──
  //
  // add_to_cart filters on is_active/is_draft, but a product can leave the
  // catalogue between the add and the order. The web checkout drops such a
  // product from its product query and fails the order; this path had no
  // equivalent predicate, so a withdrawn product stayed sellable through the
  // bot. The wording must say the catalogue no longer carries it — that is a
  // different situation from being out of stock, and the customer's remedy is
  // different too.
  it("refuses an order containing a product that has left the catalogue", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "Ventilateur Retiré",
          base_price: 45000,
          product_stock: 10,
          product_is_active: 0,
          product_is_draft: 0,
          quantity: 1,
        },
      ],
    });
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });
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
    expect(result.error).toMatch(/catalogue/i);
    expect(result.error).toContain("Ventilateur Retiré");
    // Not a stock message — the remedy is to remove the line, not to reduce it.
    expect(result.error).not.toMatch(/stock/i);
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("refuses an order containing a product returned to draft", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "Brouillon",
          base_price: 45000,
          product_stock: 10,
          product_is_active: 1,
          product_is_draft: 1,
          quantity: 1,
        },
      ],
    });
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await createOrder(ctx, {
      address: "123 Rue Principale",
      commune: "Cocody",
      phone: "0700000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/catalogue/i);
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  // A different branch of the same guard, and reachable for real: the variant
  // query spans every product in the cart, so a second product's variants are
  // in the map. Here the candidate EXISTS — only its ownership is wrong — so
  // the `!candidate` half of the guard cannot cover this one.
  it("refuses a cart line whose variant belongs to another product in the same cart", async () => {
    const ctx = createMockCtx(mockDb);

    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: "v-cheap", // belongs to p2, not p1
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          product_is_active: 1,
          product_is_draft: 0,
          quantity: 1,
        },
        {
          cart_item_id: "ci2",
          product_id: "p2",
          variant_id: "v-cheap",
          product_name: "Câble USB",
          base_price: 2000,
          product_stock: 50,
          product_is_active: 1,
          product_is_draft: 0,
          quantity: 1,
        },
      ],
    });
    // p1 has its own active variants, so resolveOrderLine's "pick a variant"
    // rule would not fire here either way — only the ownership check can.
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v1", product_id: "p1", name: "1.5 CV", price: 250000, stock_quantity: 4 },
        { id: "v-cheap", product_id: "p2", name: "1 m", price: 1, stock_quantity: 99 },
      ],
    });
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
    expect(result.error).toBe(variantGoneFromCatalogue("Climatiseur Split"));
    expect(mockDb.batch).not.toHaveBeenCalled();
  });
});

// ─── createOrder: stock reservation ───────────────────────────────────────────
//
// The read at the top of createOrder (resolveOrderLine's stock check) is a
// snapshot: between it and the write, the web checkout, the admin, or another
// bot session can take the same units. The reservation must therefore be a
// compare-and-swap, and — the half that is easy to forget — its result must be
// read. D1's batch is one SQL transaction, but an UPDATE that matches no row
// is not a failed statement: it commits with `changes: 0` and everything
// around it commits too. A predicate whose result nobody inspects would simply
// move the damage from "negative stock" to "confirmed order, nothing reserved,
// cart emptied", with no rollback available because the batch already
// committed.

describe("createOrder — stock reservation", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    primeActiveAccount(mockDb);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  /** Two orderable, variant-less lines: p1 x2 and p2 x3. */
  function stubTwoLineCart() {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: null,
          product_name: "iPhone 15",
          base_price: 650000,
          product_stock: 10,
          product_is_active: 1,
          product_is_draft: 0,
          quantity: 2,
        },
        {
          cart_item_id: "ci2",
          product_id: "p2",
          variant_id: null,
          product_name: "Chargeur",
          base_price: 15000,
          product_stock: 10,
          product_is_active: 1,
          product_is_draft: 0,
          quantity: 3,
        },
      ],
    });
    mockDb._statement.all.mockResolvedValueOnce({ results: [] }); // no variants
    mockDb._statement.first.mockResolvedValueOnce({
      id: "zone-1",
      fee: 2000,
      estimated_hours: 24,
    });
  }

  const address = { address: "123 Rue Principale", commune: "Cocody", phone: "0700000000" };

  it("guards every decrement on the stock still being there", async () => {
    stubTwoLineCart();

    await createOrder(createMockCtx(mockDb), address);

    const reservation = batchStatements(mockDb, 0);
    expect(reservation).toHaveLength(2);
    for (const stmt of reservation) {
      expect(stmt.sql).toContain("AND stock_quantity >= ?");
    }
    expect(reservation[0].params).toEqual([2, "p1", 2]);
    expect(reservation[1].params).toEqual([3, "p2", 3]);
  });

  it("targets the variant row, not the product row, for a variant line", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        {
          cart_item_id: "ci1",
          product_id: "p1",
          variant_id: "v2",
          product_name: "Climatiseur Split",
          base_price: 250000,
          product_stock: 10,
          product_is_active: 1,
          product_is_draft: 0,
          quantity: 1,
        },
      ],
    });
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v2", product_id: "p1", name: "3 CV", price: 1400000, stock_quantity: 2 },
      ],
    });
    mockDb._statement.first.mockResolvedValueOnce({
      id: "zone-1",
      fee: 2000,
      estimated_hours: 24,
    });

    await createOrder(createMockCtx(mockDb), address);

    const reservation = batchStatements(mockDb, 0);
    expect(reservation[0].sql).toContain("product_variants");
    expect(reservation[0].sql).toContain("AND stock_quantity >= ?");
    expect(reservation[0].params).toEqual([1, "v2", 1]);
  });

  it("refuses the order when a decrement is rejected, and writes no order at all", async () => {
    stubTwoLineCart();
    // Both decrements refused: someone emptied the shelf in between.
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 0 } },
      { meta: { changes: 0 } },
    ]);

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stock/i);
    // No order row, no order line, and — critically — the customer's cart is
    // still there to retry from.
    const sql = preparedSql(mockDb);
    expect(sql).not.toContain("INSERT INTO orders");
    expect(sql).not.toContain("INSERT INTO order_items");
    expect(sql).not.toContain("DELETE FROM whatsapp_carts");
  });

  it("puts back the stock it did take when a later line is refused", async () => {
    stubTwoLineCart();
    // First line reserved, second refused.
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 0 } },
    ]);

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Chargeur");

    const release = batchStatements(mockDb, 1);
    // Exactly one release: the line that was refused took nothing, and
    // crediting it back would invent stock.
    expect(release).toHaveLength(1);
    expect(release[0].sql).toContain("stock_quantity + ?");
    expect(release[0].params).toEqual([2, "p1"]);
  });

  it("releases nothing when the very first line is the one refused", async () => {
    stubTwoLineCart();
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 0 } },
      { meta: { changes: 1 } },
    ]);

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    // The second line did reserve, so it — and only it — is put back.
    const release = batchStatements(mockDb, 1);
    expect(release).toHaveLength(1);
    expect(release[0].params).toEqual([3, "p2"]);
  });

  it("treats a short result array as a refusal rather than as success", async () => {
    stubTwoLineCart();
    // Fail closed: fewer results than statements must not read as "applied".
    mockDb.batch.mockResolvedValueOnce([]);

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    expect(preparedSql(mockDb)).not.toContain("INSERT INTO orders");
  });

  it("says so when the release itself matches no row", async () => {
    stubTwoLineCart();
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 0 } },
    ]);
    // The release runs but touches nothing — the product row moved on. That is
    // a failure, not a no-op: the stock is still missing.
    mockDb.batch.mockResolvedValueOnce([{ meta: { changes: 0 } }]);

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/équipe/i);
    expect(console.error).toHaveBeenCalled();
  });

  it("stays a structured refusal when the release throws", async () => {
    stubTwoLineCart();
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 0 } },
    ]);
    mockDb.batch.mockRejectedValueOnce(new Error("D1_ERROR"));

    // No unhandled rejection: the caller gets a ToolResult either way.
    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/équipe/i);
  });

  it("distinguishes a released reservation from one it could not release", async () => {
    stubTwoLineCart();
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 0 } },
    ]);
    mockDb.batch.mockResolvedValueOnce([{ meta: { changes: 1 } }]); // release worked

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    // Asserted positively too, so `not.toMatch` cannot pass on an absent error.
    expect(result.error).toMatch(/stock/i);
    // The operator-visible half of the message is reserved for the case that
    // actually needs an operator.
    expect(result.error).not.toMatch(/équipe/i);
  });

  it("releases the whole reservation when the order write fails", async () => {
    stubTwoLineCart();
    mockDb.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 1 } },
    ]);
    // The order write is rolled back by D1, but the reservation before it was
    // its own committed batch — it has to be undone by hand.
    mockDb.batch.mockRejectedValueOnce(new Error("UNIQUE constraint failed: orders.order_number"));

    const result = await createOrder(createMockCtx(mockDb), address);

    expect(result.success).toBe(false);
    const release = batchStatements(mockDb, 2);
    expect(release).toHaveLength(2);
    expect(release[0].params).toEqual([2, "p1"]);
    expect(release[1].params).toEqual([3, "p2"]);
  });
});

// ─── getOrderStatus ───────────────────────────────────────────────────────────

describe("getOrderStatus", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    primeActiveAccount(mockDb);
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

  it("refuses a suspended account without reading the order", async () => {
    mockDb = createMockD1();
    primeBannedAccount(mockDb);
    const ctx = createMockCtx(mockDb);

    const result = await getOrderStatus(ctx, { order_number: "ORD-ABC123" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/suspendu/i);
    expect(preparedSql(mockDb)).not.toMatch(/FROM orders/i);
  });
});

// ─── listOrders ───────────────────────────────────────────────────────────────

describe("listOrders", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    primeActiveAccount(mockDb);
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

  it("refuses a suspended account without listing its orders", async () => {
    mockDb = createMockD1();
    primeBannedAccount(mockDb);
    const ctx = createMockCtx(mockDb);

    const result = await listOrders(ctx, {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/suspendu/i);
    expect(preparedSql(mockDb)).not.toMatch(/FROM orders/i);
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
