# WhatsApp Commerce & Auth — Implementation Plan (Phase 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cart management, order creation, order tracking, account linking (OTP), delivery zones, and human escalation tools to the WhatsApp bot.

**Architecture:** Extend the existing tool registry with 12 new tools. Introduce a `ToolContext` object passed to all tools (replacing raw `D1Database`), bundling DB, session, WhatsApp API, and env. The order creation tool replicates the checkout logic from `actions/checkout.ts` adapted for WhatsApp (no promo codes, no saved addresses — address collected conversationally).

**Tech Stack:** Same as Phase 1 — Cloudflare Workers, D1 (raw SQL), KV, Workers AI, Resend (for OTP emails)

---

## File Structure

### New files

```
workers/whatsapp/src/
├── tools/
│   ├── cart.ts              # cart_add, cart_view, cart_update, cart_remove, cart_clear
│   ├── orders.ts            # create_order, get_order_status, list_orders
│   ├── account.ts           # link_account, verify_otp
│   ├── delivery.ts          # get_delivery_zones
│   └── escalation.ts        # escalate_human
├── email.ts                 # Minimal Resend email sender for OTP

__tests__/unit/workers/whatsapp/tools/
├── cart.test.ts
├── orders.test.ts
├── account.test.ts
├── delivery.test.ts
└── escalation.test.ts
```

### Modified files

```
workers/whatsapp/src/types.ts          # Add ToolContext interface
workers/whatsapp/src/tools/registry.ts # Add new tool definitions + dispatch cases
workers/whatsapp/src/orchestrator.ts   # Pass ToolContext instead of raw DB
workers/whatsapp/src/llm.ts            # Update system prompt with new capabilities
workers/whatsapp/wrangler.jsonc        # Add RESEND_API_KEY env var
```

---

## Task 1: Add ToolContext type and update dispatch signature

**Files:**
- Modify: `workers/whatsapp/src/types.ts`
- Modify: `workers/whatsapp/src/tools/registry.ts`
- Modify: `workers/whatsapp/src/tools/catalogue.ts`
- Modify: `workers/whatsapp/src/orchestrator.ts`

- [ ] **Step 1: Add ToolContext to types.ts**

Append to `workers/whatsapp/src/types.ts`:

```typescript
// --- Tool Context ---

export interface ToolContext {
  db: D1Database;
  session: WhatsAppSession;
  env: Env;
}
```

- [ ] **Step 2: Update catalogue.ts to accept ToolContext**

Change all three function signatures from `db: D1Database` to `ctx: ToolContext`, then use `ctx.db` internally. Example for `searchProducts`:

```typescript
import type { ToolResult, ToolContext } from "../types";

export async function searchProducts(
  ctx: ToolContext,
  params: { query: string; category_slug?: string; limit?: number }
): Promise<ToolResult & { data: unknown[] }> {
  const limit = Math.min(params.limit ?? 5, 10);
  const searchTerm = `%${params.query}%`;
  // ... rest unchanged, but use ctx.db instead of db
```

Apply the same change to `getProduct` and `getCategories`.

- [ ] **Step 3: Update registry.ts dispatch to pass ToolContext**

```typescript
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
// ...

export async function dispatchTool(
  ctx: ToolContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "search_products":
      return searchProducts(ctx, args as { query: string; category_slug?: string; limit?: number });
    case "get_product":
      return getProduct(ctx, args as { slug: string });
    case "get_categories":
      return getCategories(ctx, args as { parent_slug?: string });
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
```

- [ ] **Step 4: Update orchestrator.ts to build and pass ToolContext**

In `handleIncomingMessage`, replace:
```typescript
const toolResult = await dispatchTool(env.DB, toolCall.function.name, args);
```
with:
```typescript
const toolCtx = { db: env.DB, session, env };
// ...
const toolResult = await dispatchTool(toolCtx, toolCall.function.name, args);
```

Move `toolCtx` construction before the loop so it's created once.

- [ ] **Step 5: Update existing catalogue tests**

In `__tests__/unit/workers/whatsapp/tools/catalogue.test.ts`, update all calls to pass a mock `ToolContext` instead of raw `D1Database`:

```typescript
const mockCtx = {
  db: mockDb as unknown as D1Database,
  session: { id: "sess_1", wa_phone: "2250700000000", user_id: null, is_verified: 0, status: "active" as const, created_at: "", updated_at: "" },
  env: {} as any,
};

// Then: searchProducts(mockCtx, { query: "iphone" })
```

- [ ] **Step 6: Run all tests to verify refactor**

```bash
npm run test -- __tests__/unit/workers/whatsapp/
```

Expected: All 29 existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add workers/whatsapp/src/ "__tests__/unit/workers/whatsapp/"
git commit -m "refactor(whatsapp): introduce ToolContext for tool dispatch"
```

---

## Task 2: Implement cart tools

**Files:**
- Create: `workers/whatsapp/src/tools/cart.ts`
- Test: `__tests__/unit/workers/whatsapp/tools/cart.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cartAdd, cartView, cartUpdate, cartRemove, cartClear } from "../../../../../workers/whatsapp/src/tools/cart";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

function createMockCtx(overrides?: Partial<ToolContext>) {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  const mockDb = { prepare: vi.fn().mockReturnValue(mockStatement), _statement: mockStatement };
  return {
    ctx: {
      db: mockDb as unknown as D1Database,
      session: { id: "sess_1", wa_phone: "2250700000000", user_id: "usr_1", is_verified: 1, status: "active" as const, created_at: "", updated_at: "" },
      env: {} as any,
      ...overrides,
    } as ToolContext,
    mockDb,
  };
}

describe("cartAdd", () => {
  it("adds item to cart and returns confirmation", async () => {
    const { ctx, mockDb } = createMockCtx();
    // Product lookup
    mockDb._statement.first.mockResolvedValueOnce({ id: "p1", name: "iPhone 15", base_price: 650000, stock_quantity: 5 });
    // No variant
    // Existing cart item check
    mockDb._statement.first.mockResolvedValueOnce(null);
    // Insert
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await cartAdd(ctx, { product_id: "p1", quantity: 1 });

    expect(result.success).toBe(true);
  });

  it("returns error if product not found", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await cartAdd(ctx, { product_id: "nope", quantity: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });
});

describe("cartView", () => {
  it("returns cart items with totals", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "ci1", product_id: "p1", variant_id: null, quantity: 2, product_name: "iPhone 15", product_price: 650000, variant_name: null, variant_price: null },
      ],
    });

    const result = await cartView(ctx);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ items: expect.any(Array), subtotal: 1300000 });
  });

  it("returns empty cart message", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await cartView(ctx);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ items: [], subtotal: 0 });
  });
});

describe("cartRemove", () => {
  it("removes item from cart", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.run.mockResolvedValueOnce({ success: true, meta: { changes: 1 } });

    const result = await cartRemove(ctx, { item_id: "ci1" });

    expect(result.success).toBe(true);
  });
});

describe("cartClear", () => {
  it("clears all items from cart", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await cartClear(ctx);

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/cart.test.ts
```

- [ ] **Step 3: Implement `tools/cart.ts`**

```typescript
import type { ToolResult, ToolContext } from "../types";

export async function cartAdd(
  ctx: ToolContext,
  params: { product_id: string; variant_id?: string; quantity?: number }
): Promise<ToolResult> {
  const quantity = params.quantity ?? 1;
  const { db, session } = ctx;

  // Validate product exists and is in stock
  const product = await db
    .prepare("SELECT id, name, base_price, stock_quantity FROM products WHERE id = ? AND is_active = 1 AND is_draft = 0")
    .bind(params.product_id)
    .first<{ id: string; name: string; base_price: number; stock_quantity: number }>();

  if (!product) return { success: false, error: "Produit introuvable ou indisponible" };

  let unitPrice = product.base_price;
  let itemName = product.name;

  if (params.variant_id) {
    const variant = await db
      .prepare("SELECT id, name, price, stock_quantity FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1")
      .bind(params.variant_id, params.product_id)
      .first<{ id: string; name: string; price: number; stock_quantity: number }>();

    if (!variant) return { success: false, error: "Variante introuvable" };
    if (variant.stock_quantity < quantity) {
      return { success: false, error: `Stock insuffisant pour ${itemName} - ${variant.name} (${variant.stock_quantity} disponible(s))` };
    }
    unitPrice = variant.price;
    itemName = `${product.name} - ${variant.name}`;
  } else {
    if (product.stock_quantity < quantity) {
      return { success: false, error: `Stock insuffisant pour ${product.name} (${product.stock_quantity} disponible(s))` };
    }
  }

  // Check if already in cart — update quantity if so
  const existing = await db
    .prepare("SELECT id, quantity FROM whatsapp_carts WHERE session_id = ? AND product_id = ? AND variant_id IS ?")
    .bind(session.id, params.product_id, params.variant_id ?? null)
    .first<{ id: string; quantity: number }>();

  if (existing) {
    const newQty = existing.quantity + quantity;
    await db
      .prepare("UPDATE whatsapp_carts SET quantity = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newQty, existing.id)
      .run();
    return { success: true, data: { message: `${itemName} mis à jour (${newQty} unité(s))`, quantity: newQty, unit_price: unitPrice } };
  }

  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO whatsapp_carts (id, session_id, product_id, variant_id, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))")
    .bind(id, session.id, params.product_id, params.variant_id ?? null, quantity)
    .run();

  return { success: true, data: { message: `${itemName} ajouté au panier (${quantity} unité(s))`, quantity, unit_price: unitPrice } };
}

export async function cartView(ctx: ToolContext): Promise<ToolResult & { data: { items: unknown[]; subtotal: number } }> {
  const { db, session } = ctx;

  const { results } = await db
    .prepare(
      `SELECT wc.id, wc.product_id, wc.variant_id, wc.quantity,
              p.name as product_name, p.base_price as product_price,
              pv.name as variant_name, pv.price as variant_price
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       LEFT JOIN product_variants pv ON wc.variant_id = pv.id
       WHERE wc.session_id = ?
       ORDER BY wc.created_at`
    )
    .bind(session.id)
    .all<{ id: string; product_id: string; variant_id: string | null; quantity: number; product_name: string; product_price: number; variant_name: string | null; variant_price: number | null }>();

  const items = results.map((r) => ({
    id: r.id,
    name: r.variant_name ? `${r.product_name} - ${r.variant_name}` : r.product_name,
    quantity: r.quantity,
    unit_price: r.variant_price ?? r.product_price,
    total: (r.variant_price ?? r.product_price) * r.quantity,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return { success: true, data: { items, subtotal } };
}

export async function cartUpdate(
  ctx: ToolContext,
  params: { item_id: string; quantity: number }
): Promise<ToolResult> {
  if (params.quantity <= 0) return cartRemove(ctx, { item_id: params.item_id });

  await ctx.db
    .prepare("UPDATE whatsapp_carts SET quantity = ?, updated_at = datetime('now') WHERE id = ? AND session_id = ?")
    .bind(params.quantity, params.item_id, ctx.session.id)
    .run();

  return { success: true, data: { message: `Quantité mise à jour (${params.quantity})` } };
}

export async function cartRemove(
  ctx: ToolContext,
  params: { item_id: string }
): Promise<ToolResult> {
  await ctx.db
    .prepare("DELETE FROM whatsapp_carts WHERE id = ? AND session_id = ?")
    .bind(params.item_id, ctx.session.id)
    .run();

  return { success: true, data: { message: "Article retiré du panier" } };
}

export async function cartClear(ctx: ToolContext): Promise<ToolResult> {
  await ctx.db
    .prepare("DELETE FROM whatsapp_carts WHERE session_id = ?")
    .bind(ctx.session.id)
    .run();

  return { success: true, data: { message: "Panier vidé" } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/cart.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/tools/cart.ts "__tests__/unit/workers/whatsapp/tools/cart.test.ts"
git commit -m "feat(whatsapp): implement cart tools (add, view, update, remove, clear)"
```

---

## Task 3: Implement delivery zones tool

**Files:**
- Create: `workers/whatsapp/src/tools/delivery.ts`
- Test: `__tests__/unit/workers/whatsapp/tools/delivery.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDeliveryZones } from "../../../../../workers/whatsapp/src/tools/delivery";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

function createMockCtx() {
  const mockStatement = { bind: vi.fn().mockReturnThis(), first: vi.fn(), run: vi.fn(), all: vi.fn() };
  const mockDb = { prepare: vi.fn().mockReturnValue(mockStatement), _statement: mockStatement };
  return {
    ctx: { db: mockDb as unknown as D1Database, session: {} as any, env: {} as any } as ToolContext,
    mockDb,
  };
}

describe("getDeliveryZones", () => {
  it("returns active delivery zones with fees", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "z1", name: "Cocody", commune: "Cocody", fee: 2000, estimated_hours: 24 },
        { id: "z2", name: "Plateau", commune: "Plateau", fee: 1500, estimated_hours: 12 },
      ],
    });

    const result = await getDeliveryZones(ctx);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ name: "Cocody", fee: 2000 });
  });
});
```

- [ ] **Step 2: Implement `tools/delivery.ts`**

```typescript
import type { ToolResult, ToolContext } from "../types";

export async function getDeliveryZones(
  ctx: ToolContext
): Promise<ToolResult & { data: unknown[] }> {
  const { results } = await ctx.db
    .prepare("SELECT id, name, commune, fee, estimated_hours FROM delivery_zones WHERE is_active = 1 ORDER BY name ASC")
    .all<{ id: string; name: string; commune: string; fee: number; estimated_hours: number }>();

  return {
    success: true,
    data: results.map((z) => ({
      name: z.name,
      commune: z.commune,
      fee: z.fee,
      estimated_hours: z.estimated_hours,
    })),
  };
}
```

- [ ] **Step 3: Run test, verify pass, commit**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/delivery.test.ts
git add workers/whatsapp/src/tools/delivery.ts "__tests__/unit/workers/whatsapp/tools/delivery.test.ts"
git commit -m "feat(whatsapp): implement delivery zones tool"
```

---

## Task 4: Implement order creation tool

**Files:**
- Create: `workers/whatsapp/src/tools/orders.ts`
- Test: `__tests__/unit/workers/whatsapp/tools/orders.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder, getOrderStatus, listOrders } from "../../../../../workers/whatsapp/src/tools/orders";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

function createMockCtx(userId: string | null = "usr_1") {
  const mockStatement = { bind: vi.fn().mockReturnThis(), first: vi.fn(), run: vi.fn(), all: vi.fn() };
  const mockDb = {
    prepare: vi.fn().mockReturnValue(mockStatement),
    batch: vi.fn(),
    _statement: mockStatement,
  };
  return {
    ctx: {
      db: mockDb as unknown as D1Database,
      session: { id: "sess_1", wa_phone: "2250700000000", user_id: userId, is_verified: userId ? 1 : 0, status: "active" as const, created_at: "", updated_at: "" },
      env: {} as any,
    } as ToolContext,
    mockDb,
  };
}

describe("createOrder", () => {
  it("returns error if account not linked", async () => {
    const { ctx } = createMockCtx(null);
    const result = await createOrder(ctx, { address: "123 Rue", commune: "Cocody", phone: "0700000000" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("compte");
  });

  it("returns error if cart is empty", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });
    const result = await createOrder(ctx, { address: "123 Rue", commune: "Cocody", phone: "0700000000" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("panier");
  });
});

describe("getOrderStatus", () => {
  it("returns order status for a valid order number", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce({
      order_number: "ORD-A3K9Z2",
      status: "confirmed",
      total: 652000,
      created_at: "2026-04-13T10:00:00Z",
      estimated_delivery: "2026-04-14T10:00:00Z",
    });

    const result = await getOrderStatus(ctx, { order_number: "ORD-A3K9Z2" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ order_number: "ORD-A3K9Z2", status: "confirmed" });
  });

  it("returns error for unknown order", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce(null);
    const result = await getOrderStatus(ctx, { order_number: "ORD-NOPE" });
    expect(result.success).toBe(false);
  });
});

describe("listOrders", () => {
  it("returns recent orders for the user", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { order_number: "ORD-ABC123", status: "delivered", total: 500000, created_at: "2026-04-10" },
      ],
    });

    const result = await listOrders(ctx, {});

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("returns error if not linked", async () => {
    const { ctx } = createMockCtx(null);
    const result = await listOrders(ctx, {});
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `tools/orders.ts`**

```typescript
import type { ToolResult, ToolContext } from "../types";

export async function createOrder(
  ctx: ToolContext,
  params: { address: string; commune: string; phone: string; instructions?: string }
): Promise<ToolResult> {
  const { db, session } = ctx;

  if (!session.user_id) {
    return { success: false, error: "Vous devez d'abord lier votre compte NETEREKA pour commander." };
  }

  // Get cart items
  const { results: cartItems } = await db
    .prepare(
      `SELECT wc.id, wc.product_id, wc.variant_id, wc.quantity,
              p.name as product_name, p.base_price, p.stock_quantity as product_stock,
              pv.name as variant_name, pv.price as variant_price, pv.stock_quantity as variant_stock
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       LEFT JOIN product_variants pv ON wc.variant_id = pv.id
       WHERE wc.session_id = ?`
    )
    .bind(session.id)
    .all<{
      id: string; product_id: string; variant_id: string | null; quantity: number;
      product_name: string; base_price: number; product_stock: number;
      variant_name: string | null; variant_price: number | null; variant_stock: number | null;
    }>();

  if (cartItems.length === 0) {
    return { success: false, error: "Votre panier est vide. Ajoutez des articles avant de commander." };
  }

  // Validate stock
  const orderItems: Array<{
    productId: string; variantId: string | null;
    productName: string; variantName: string | null;
    unitPrice: number; quantity: number;
  }> = [];

  for (const item of cartItems) {
    const unitPrice = item.variant_price ?? item.base_price;
    const stock = item.variant_stock ?? item.product_stock;

    if (stock < item.quantity) {
      return { success: false, error: `Stock insuffisant pour ${item.product_name}${item.variant_name ? ` - ${item.variant_name}` : ""} (${stock} disponible(s))` };
    }

    orderItems.push({
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.product_name,
      variantName: item.variant_name,
      unitPrice,
      quantity: item.quantity,
    });
  }

  // Delivery zone lookup
  const zone = await db
    .prepare("SELECT id, fee, estimated_hours FROM delivery_zones WHERE commune = ? AND is_active = 1 LIMIT 1")
    .bind(params.commune)
    .first<{ id: string; fee: number; estimated_hours: number }>();

  if (!zone) {
    return { success: false, error: `La commune "${params.commune}" n'est pas dans notre zone de livraison. Utilisez get_delivery_zones pour voir les communes disponibles.` };
  }

  // Calculate totals
  const subtotal = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal + zone.fee;

  // Generate order number
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let orderNumber = "ORD-";
  for (let i = 0; i < 6; i++) orderNumber += chars.charAt(Math.floor(Math.random() * chars.length));

  const orderId = crypto.randomUUID();
  const estimatedDate = new Date();
  estimatedDate.setHours(estimatedDate.getHours() + zone.estimated_hours);

  // Create order + items atomically via batch
  const stmts = [
    db.prepare(
      `INSERT INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, channel, delivery_address, delivery_commune, delivery_phone, delivery_instructions, estimated_delivery, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?, 0, ?, 'whatsapp', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(orderId, session.user_id, orderNumber, subtotal, zone.fee, total, params.address, params.commune, params.phone, params.instructions ?? null, estimatedDate.toISOString()),
  ];

  for (const item of orderItems) {
    const itemId = crypto.randomUUID();
    stmts.push(
      db.prepare(
        `INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(itemId, orderId, item.productId, item.variantId, item.productName, item.variantName, item.quantity, item.unitPrice, item.unitPrice * item.quantity)
    );
  }

  // Clear cart after order
  stmts.push(
    db.prepare("DELETE FROM whatsapp_carts WHERE session_id = ?").bind(session.id)
  );

  await db.batch(stmts);

  return {
    success: true,
    data: {
      order_number: orderNumber,
      subtotal,
      delivery_fee: zone.fee,
      total,
      estimated_delivery: estimatedDate.toISOString(),
      items_count: orderItems.length,
      message: `Commande ${orderNumber} créée ! Total: ${total} FCFA. Livraison estimée: ${zone.estimated_hours}h.`,
    },
  };
}

export async function getOrderStatus(
  ctx: ToolContext,
  params: { order_number: string }
): Promise<ToolResult> {
  const { db, session } = ctx;

  const order = await db
    .prepare(
      `SELECT order_number, status, subtotal, delivery_fee, total, delivery_commune,
              estimated_delivery, created_at
       FROM orders
       WHERE order_number = ? AND user_id = ?`
    )
    .bind(params.order_number, session.user_id)
    .first<{
      order_number: string; status: string; subtotal: number; delivery_fee: number;
      total: number; delivery_commune: string; estimated_delivery: string | null; created_at: string;
    }>();

  if (!order) {
    return { success: false, error: "Commande introuvable. Vérifiez le numéro de commande." };
  }

  return { success: true, data: order };
}

export async function listOrders(
  ctx: ToolContext,
  params: { limit?: number }
): Promise<ToolResult & { data?: unknown[] }> {
  if (!ctx.session.user_id) {
    return { success: false, error: "Vous devez lier votre compte pour voir vos commandes." };
  }

  const limit = Math.min(params.limit ?? 5, 10);

  const { results } = await ctx.db
    .prepare(
      `SELECT order_number, status, total, created_at
       FROM orders WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .bind(ctx.session.user_id, limit)
    .all<{ order_number: string; status: string; total: number; created_at: string }>();

  return { success: true, data: results };
}
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/orders.test.ts
git add workers/whatsapp/src/tools/orders.ts "__tests__/unit/workers/whatsapp/tools/orders.test.ts"
git commit -m "feat(whatsapp): implement order tools (create, status, list)"
```

---

## Task 5: Implement minimal email sender for OTP

**Files:**
- Create: `workers/whatsapp/src/email.ts`

- [ ] **Step 1: Add RESEND_API_KEY to Worker env**

In `workers/whatsapp/src/types.ts`, add to the `Env` interface:

```typescript
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  RESEND_API_KEY?: string;
}
```

- [ ] **Step 2: Create `email.ts`**

```typescript
export async function sendOtpEmail(
  apiKey: string,
  to: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NETEREKA <commandes@netereka.ci>",
      to,
      subject: `Votre code de vérification NETEREKA: ${otpCode}`,
      html: `<p>Bonjour,</p><p>Votre code de vérification WhatsApp NETEREKA est : <strong>${otpCode}</strong></p><p>Ce code expire dans 10 minutes.</p><p>L'équipe NETEREKA</p>`,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { message?: string };
    return { success: false, error: data.message ?? "Email sending failed" };
  }

  return { success: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add workers/whatsapp/src/email.ts workers/whatsapp/src/types.ts
git commit -m "feat(whatsapp): add minimal Resend email sender for OTP"
```

---

## Task 6: Implement account linking tools

**Files:**
- Create: `workers/whatsapp/src/tools/account.ts`
- Test: `__tests__/unit/workers/whatsapp/tools/account.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { linkAccount, verifyOtp } from "../../../../../workers/whatsapp/src/tools/account";
import type { ToolContext, Env } from "../../../../../workers/whatsapp/src/types";

function createMockCtx() {
  const mockStatement = { bind: vi.fn().mockReturnThis(), first: vi.fn(), run: vi.fn(), all: vi.fn() };
  const mockDb = { prepare: vi.fn().mockReturnValue(mockStatement), _statement: mockStatement };
  return {
    ctx: {
      db: mockDb as unknown as D1Database,
      session: { id: "sess_1", wa_phone: "2250700000000", user_id: null, is_verified: 0, status: "active" as const, created_at: "", updated_at: "" },
      env: { RESEND_API_KEY: "test_key" } as unknown as Env,
    } as ToolContext,
    mockDb,
  };
}

// Mock the email module
vi.mock("../../../../../workers/whatsapp/src/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe("linkAccount", () => {
  it("returns error if already verified", async () => {
    const { ctx } = createMockCtx();
    ctx.session.is_verified = 1;
    ctx.session.user_id = "usr_1";
    const result = await linkAccount(ctx, { email: "test@test.com" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("déjà lié");
  });

  it("returns error if no user found with that email", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce(null);
    const result = await linkAccount(ctx, { email: "nope@test.com" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Aucun compte");
  });

  it("generates OTP and sends email when user found", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce({ id: "usr_42", email: "test@test.com" });
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await linkAccount(ctx, { email: "test@test.com" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ message: expect.stringContaining("code") });
  });
});

describe("verifyOtp", () => {
  it("returns error if no OTP pending", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce({ otp_code: null, otp_expires_at: null });
    const result = await verifyOtp(ctx, { code: "123456" });
    expect(result.success).toBe(false);
  });

  it("returns error for wrong code", async () => {
    const { ctx, mockDb } = createMockCtx();
    const future = new Date(Date.now() + 600000).toISOString();
    mockDb._statement.first.mockResolvedValueOnce({ otp_code: "654321", otp_expires_at: future, user_id: null });
    const result = await verifyOtp(ctx, { code: "123456" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("incorrect");
  });

  it("links account on correct code", async () => {
    const { ctx, mockDb } = createMockCtx();
    const future = new Date(Date.now() + 600000).toISOString();
    mockDb._statement.first.mockResolvedValueOnce({ otp_code: "123456", otp_expires_at: future, user_id: "usr_42" });
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await verifyOtp(ctx, { code: "123456" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ message: expect.stringContaining("lié") });
  });
});
```

- [ ] **Step 2: Implement `tools/account.ts`**

```typescript
import type { ToolResult, ToolContext } from "../types";
import { sendOtpEmail } from "../email";

export async function linkAccount(
  ctx: ToolContext,
  params: { email: string }
): Promise<ToolResult> {
  const { db, session, env } = ctx;

  if (session.is_verified === 1 && session.user_id) {
    return { success: false, error: "Votre compte est déjà lié. Vous pouvez passer commande." };
  }

  // Find user by email
  const user = await db
    .prepare("SELECT id, email FROM user WHERE email = ?")
    .bind(params.email.toLowerCase().trim())
    .first<{ id: string; email: string }>();

  if (!user) {
    return { success: false, error: `Aucun compte NETEREKA trouvé avec l'email ${params.email}. Créez un compte sur netereka.ci d'abord.` };
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Store OTP + pending user_id in session
  await db
    .prepare("UPDATE whatsapp_sessions SET otp_code = ?, otp_expires_at = ?, user_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(otp, expiresAt, user.id, session.id)
    .run();

  // Send OTP email
  if (env.RESEND_API_KEY) {
    await sendOtpEmail(env.RESEND_API_KEY, user.email, otp);
  }

  return { success: true, data: { message: `Un code de vérification a été envoyé à ${params.email}. Envoyez-le moi pour lier votre compte.` } };
}

export async function verifyOtp(
  ctx: ToolContext,
  params: { code: string }
): Promise<ToolResult> {
  const { db, session } = ctx;

  // Get current OTP from session
  const sessionData = await db
    .prepare("SELECT otp_code, otp_expires_at, user_id FROM whatsapp_sessions WHERE id = ?")
    .bind(session.id)
    .first<{ otp_code: string | null; otp_expires_at: string | null; user_id: string | null }>();

  if (!sessionData?.otp_code || !sessionData.otp_expires_at) {
    return { success: false, error: "Aucun code en attente. Utilisez d'abord la commande de liaison de compte avec votre email." };
  }

  if (new Date(sessionData.otp_expires_at) < new Date()) {
    return { success: false, error: "Le code a expiré. Demandez un nouveau code." };
  }

  if (sessionData.otp_code !== params.code.trim()) {
    return { success: false, error: "Code incorrect. Vérifiez votre email et réessayez." };
  }

  // Link account
  await db
    .prepare("UPDATE whatsapp_sessions SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL, updated_at = datetime('now') WHERE id = ?")
    .bind(session.id)
    .run();

  // Update session object in memory for the rest of this request
  session.is_verified = 1;
  session.user_id = sessionData.user_id;

  return { success: true, data: { message: "Compte lié avec succès ! Vous pouvez maintenant passer des commandes via WhatsApp." } };
}
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/account.test.ts
git add workers/whatsapp/src/tools/account.ts "__tests__/unit/workers/whatsapp/tools/account.test.ts"
git commit -m "feat(whatsapp): implement account linking tools (OTP)"
```

---

## Task 7: Implement escalation tool

**Files:**
- Create: `workers/whatsapp/src/tools/escalation.ts`
- Test: `__tests__/unit/workers/whatsapp/tools/escalation.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { escalateHuman } from "../../../../../workers/whatsapp/src/tools/escalation";
import type { ToolContext, Env } from "../../../../../workers/whatsapp/src/types";

function createMockCtx() {
  const mockStatement = { bind: vi.fn().mockReturnThis(), first: vi.fn(), run: vi.fn(), all: vi.fn() };
  const mockDb = { prepare: vi.fn().mockReturnValue(mockStatement), _statement: mockStatement };
  return {
    ctx: {
      db: mockDb as unknown as D1Database,
      session: { id: "sess_1", wa_phone: "2250700000000", user_id: "usr_1", is_verified: 1, status: "active" as const, created_at: "", updated_at: "" },
      env: {} as unknown as Env,
    } as ToolContext,
    mockDb,
  };
}

// Mock WhatsAppAPI
vi.mock("../../../../../workers/whatsapp/src/whatsapp-api", () => ({
  WhatsAppAPI: vi.fn().mockImplementation(() => ({
    sendText: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

describe("escalateHuman", () => {
  it("updates session status to escalated", async () => {
    const { ctx, mockDb } = createMockCtx();
    // whatsapp_config lookup
    mockDb._statement.first.mockResolvedValueOnce({
      phone_number_id: "pid", access_token: "tok", admin_phones: '["2250700000001"]',
    });
    // session update
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await escalateHuman(ctx, { reason: "Client frustrated" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ message: expect.stringContaining("conseiller") });
  });

  it("works even without admin phones configured", async () => {
    const { ctx, mockDb } = createMockCtx();
    mockDb._statement.first.mockResolvedValueOnce({
      phone_number_id: "pid", access_token: "tok", admin_phones: "[]",
    });
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await escalateHuman(ctx, { reason: "Complex question" });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `tools/escalation.ts`**

```typescript
import type { ToolResult, ToolContext } from "../types";
import { WhatsAppAPI } from "../whatsapp-api";

export async function escalateHuman(
  ctx: ToolContext,
  params: { reason: string }
): Promise<ToolResult> {
  const { db, session } = ctx;

  // Mark session as escalated
  await db
    .prepare("UPDATE whatsapp_sessions SET status = 'escalated', updated_at = datetime('now') WHERE id = ?")
    .bind(session.id)
    .run();

  // Notify admin phones via WhatsApp
  const config = await db
    .prepare("SELECT phone_number_id, access_token, admin_phones FROM whatsapp_config WHERE id = 1")
    .first<{ phone_number_id: string; access_token: string; admin_phones: string }>();

  if (config) {
    const adminPhones = JSON.parse(config.admin_phones) as string[];
    if (adminPhones.length > 0) {
      const api = new WhatsAppAPI(config.phone_number_id, config.access_token);
      const alertMsg = `🚨 Escalade demandée\nClient: ${session.wa_phone}\nRaison: ${params.reason}`;
      for (const phone of adminPhones) {
        api.sendText(phone, alertMsg).catch(() => {}); // fire-and-forget
      }
    }
  }

  return {
    success: true,
    data: { message: "Un conseiller va prendre le relais sous peu. Merci de votre patience." },
  };
}
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/escalation.test.ts
git add workers/whatsapp/src/tools/escalation.ts "__tests__/unit/workers/whatsapp/tools/escalation.test.ts"
git commit -m "feat(whatsapp): implement human escalation tool"
```

---

## Task 8: Register all new tools and update system prompt

**Files:**
- Modify: `workers/whatsapp/src/tools/registry.ts`
- Modify: `workers/whatsapp/src/llm.ts`

- [ ] **Step 1: Add new tool definitions to registry.ts**

Import new tool modules and add their definitions to `TOOL_DEFINITIONS`:

```typescript
import { cartAdd, cartView, cartUpdate, cartRemove, cartClear } from "./cart";
import { getDeliveryZones } from "./delivery";
import { createOrder, getOrderStatus, listOrders } from "./orders";
import { linkAccount, verifyOtp } from "./account";
import { escalateHuman } from "./escalation";
```

Add to `TOOL_DEFINITIONS` array (after existing entries):

```typescript
  {
    type: "function",
    function: {
      name: "cart_add",
      description: "Add a product to the WhatsApp cart. Use after the customer confirms they want an item.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product ID" },
          variant_id: { type: "string", description: "Variant ID (required if product has variants)" },
          quantity: { type: "number", description: "Quantity (default 1)" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_view",
      description: "Show the current WhatsApp cart contents and subtotal.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_update",
      description: "Update the quantity of an item in the cart.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Cart item ID" },
          quantity: { type: "number", description: "New quantity (0 to remove)" },
        },
        required: ["item_id", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_remove",
      description: "Remove an item from the cart.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Cart item ID to remove" },
        },
        required: ["item_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_clear",
      description: "Clear all items from the cart.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_delivery_zones",
      description: "List available delivery zones with fees. Use when customer asks about delivery areas or costs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Place an order from the current WhatsApp cart. Requires a linked account. Collects delivery address, commune, and phone.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Full delivery address" },
          commune: { type: "string", description: "Delivery commune (must match a delivery zone)" },
          phone: { type: "string", description: "Contact phone for delivery" },
          instructions: { type: "string", description: "Optional delivery instructions" },
        },
        required: ["address", "commune", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Check the status of an order by its number.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "Order number (e.g., ORD-A3K9Z2)" },
        },
        required: ["order_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "List recent orders for the linked customer account.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max orders to return (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_account",
      description: "Link a NETEREKA account to this WhatsApp number by sending an OTP to the customer's email.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Customer's NETEREKA account email" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_otp",
      description: "Verify the OTP code sent to the customer's email to complete account linking.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "6-digit verification code" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_human",
      description: "Transfer the conversation to a human agent. Use when the customer is frustrated, has a complex issue, or explicitly asks to speak to a person.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Brief reason for escalation" },
        },
        required: ["reason"],
      },
    },
  },
```

- [ ] **Step 2: Add dispatch cases**

Add to the `switch` in `dispatchTool`:

```typescript
    case "cart_add":
      return cartAdd(ctx, args as { product_id: string; variant_id?: string; quantity?: number });
    case "cart_view":
      return cartView(ctx);
    case "cart_update":
      return cartUpdate(ctx, args as { item_id: string; quantity: number });
    case "cart_remove":
      return cartRemove(ctx, args as { item_id: string });
    case "cart_clear":
      return cartClear(ctx);
    case "get_delivery_zones":
      return getDeliveryZones(ctx);
    case "create_order":
      return createOrder(ctx, args as { address: string; commune: string; phone: string; instructions?: string });
    case "get_order_status":
      return getOrderStatus(ctx, args as { order_number: string });
    case "list_orders":
      return listOrders(ctx, args as { limit?: number });
    case "link_account":
      return linkAccount(ctx, args as { email: string });
    case "verify_otp":
      return verifyOtp(ctx, args as { code: string });
    case "escalate_human":
      return escalateHuman(ctx, args as { reason: string });
```

- [ ] **Step 3: Update LLM system prompt in `llm.ts`**

Update the `base` string in `buildSystemPrompt` to include new capabilities:

```typescript
  const base = `Tu es l'assistant commercial de NETEREKA Electronic, une boutique en ligne d'électronique en Côte d'Ivoire.

RÈGLES:
- Réponds toujours en français, sauf si le client écrit en anglais
- Monnaie: XOF (FCFA). Affiche les prix avec le format "XXX XXX FCFA"
- Paiement: à la livraison uniquement (cash on delivery)
- Sois professionnel, amical et concis — messages courts adaptés à WhatsApp
- Utilise *gras* pour les noms de produits et les prix
- Maximum 1-2 emojis par message
- Ne réponds qu'aux sujets liés à NETEREKA et ses produits
- Si tu ne connais pas la réponse, propose de transférer à un conseiller

CAPACITÉS:
- Rechercher des produits dans le catalogue
- Afficher les détails d'un produit (prix, stock, variantes)
- Lister les catégories de produits
- Gérer le panier (ajouter, voir, modifier, supprimer, vider)
- Afficher les zones et frais de livraison
- Transférer à un conseiller humain si nécessaire`;
```

Update the verified block:

```typescript
  if (isVerified) {
    return `${base}
- Passer des commandes à partir du panier
- Suivre le statut d'une commande
- Voir l'historique des commandes

PROCESSUS DE COMMANDE:
1. Le client ajoute des articles au panier
2. Le client demande à commander
3. Tu demandes l'adresse de livraison, la commune et le téléphone
4. Tu vérifies la zone de livraison et le montant
5. Tu confirmes la commande avec create_order`;
  }
```

Update the unverified block:

```typescript
  return `${base}

COMPTE NON LIÉ:
Le client n'a pas encore lié son compte NETEREKA. Il peut parcourir le catalogue, ajouter au panier et poser des questions.
Pour commander, il doit d'abord lier son compte via son email NETEREKA (un code de vérification sera envoyé).
Propose la liaison de compte quand le client essaie de commander.`;
```

- [ ] **Step 4: Run all tests**

```bash
npm run test -- __tests__/unit/workers/whatsapp/
```

Expected: All tests pass (existing + new).

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/tools/registry.ts workers/whatsapp/src/llm.ts
git commit -m "feat(whatsapp): register all Phase 2 tools and update system prompt"
```

---

## Task 9: Add RESEND_API_KEY to Worker wrangler config

**Files:**
- Modify: `workers/whatsapp/wrangler.jsonc`

- [ ] **Step 1: Document the secret requirement**

Add a comment to `workers/whatsapp/wrangler.jsonc` noting the required secret:

The `RESEND_API_KEY` is a secret and should NOT be in wrangler.jsonc. It must be set via:
```bash
npx wrangler secret put RESEND_API_KEY --config workers/whatsapp/wrangler.jsonc
```

No file change needed — the Env interface already declares it as optional.

- [ ] **Step 2: Final verification**

```bash
npm run test 2>&1 | tail -5
npx tsc --noEmit
cd workers/whatsapp && npx wrangler deploy --dry-run
```

Expected: All pass.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A && git status
git commit -m "feat(whatsapp): Phase 2 complete — commerce and auth tools"
```

---

## Phase 2 Complete

At this point the WhatsApp bot can:
- **Cart**: Add, view, update, remove, clear items
- **Orders**: Create orders from cart, check status, list order history
- **Account**: Link NETEREKA account via email OTP, verify code
- **Delivery**: Show available delivery zones with fees
- **Escalation**: Transfer to human agent with admin WhatsApp notification
- **All Phase 1 capabilities** (catalogue search, product details, categories)

**Next phases:**
- **Phase 3:** Admin dashboard (config page, conversations viewer, analytics)
- **Phase 4:** Storefront WhatsApp buttons + proactive notifications + service binding
