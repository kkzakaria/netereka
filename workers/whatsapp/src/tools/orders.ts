import type { ToolContext, ToolResult } from "../types";
// Shared with the web checkout on purpose: order-line pricing has exactly one
// implementation in this repo. It is a pure module whose only import is an
// `import type`, so nothing is pulled into the Worker bundle.
import {
  resolveOrderLine,
  countActiveVariantsByProduct,
  calculateSubtotal,
} from "../../../../lib/utils/checkout";
// Same reason: the SQL that takes stock and the SQL that gives it back has one
// implementation in this repo, shared with lib/db/orders.ts. Pure strings.
import {
  buildStockDecrement,
  buildStockRestore,
  stockUpdateApplied,
} from "../../../../lib/utils/stock";
import {
  isProductInCatalogue,
  productGoneFromCatalogue,
  variantGoneFromCatalogue,
} from "./line-issues";

interface CartItemRow {
  cart_item_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  base_price: number;
  product_stock: number;
  product_is_active: number;
  product_is_draft: number;
  quantity: number;
}

interface ActiveVariantRow {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface ResolvedOrderLine {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
}

interface DeliveryZoneRow {
  id: string;
  fee: number;
  estimated_hours: number;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  estimated_delivery: string | null;
}

function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${result}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Stock reservation ────────────────────────────────────────────────────────
//
// The stock check done while resolving the lines above is a read: between it
// and the write, the web checkout, an admin, or another bot session can take
// the same units. Reserving is therefore a compare-and-swap
// (`AND stock_quantity >= ?`, see lib/utils/stock.ts) whose result is read
// statement by statement.
//
// Reading the result is not optional. `D1Database.batch` is a single SQL
// transaction, but an UPDATE that matches no row is not a failed statement:
// D1 commits it with `changes: 0`, and every other statement in the batch
// commits too. There is no rollback available afterwards. That is why the
// reservation is a batch of its own, run before anything is written: when a
// line is refused, no order row exists, no order line exists, and the
// customer's cart is still there to retry from — the only thing left to undo
// is the stock the earlier lines did take.
//
// The cost of that ordering is a window where stock is held with no order to
// show for it, if the isolate dies between the two batches. That is the lesser
// evil: leaked reservation is recoverable by an operator, whereas the reverse
// ordering hands the customer a confirmed order the shop cannot fulfil.

/** Refusal messages. Only the "…équipe…" ones need a human. */
function outOfStockReleased(productName: string): string {
  return `Stock insuffisant pour ${productName} : les derniers exemplaires viennent d'être commandés. Votre commande n'a pas été enregistrée et votre panier reste intact.`;
}

function outOfStockNotReleased(productName: string): string {
  return `Stock insuffisant pour ${productName}. Votre commande n'a pas été enregistrée, mais le stock déjà réservé pour les autres articles n'a pas pu être libéré : notre équipe a été prévenue.`;
}

const RESERVATION_UNAVAILABLE =
  "Nous n'avons pas pu réserver le stock de votre commande. Votre panier reste intact : merci de réessayer dans un instant.";

const ORDER_WRITE_FAILED_RELEASED =
  "L'enregistrement de votre commande a échoué. Le stock réservé a été libéré et votre panier reste intact : merci de réessayer.";

const ORDER_WRITE_FAILED_NOT_RELEASED =
  "L'enregistrement de votre commande a échoué et le stock réservé n'a pas pu être libéré : notre équipe a été prévenue.";

/**
 * Gives back stock that was reserved. Never throws — it is only ever called
 * from a failure path, and an exception escaping here would replace a
 * structured refusal with an unhandled rejection, leaving the caller with
 * nothing to say to the customer.
 *
 * Returns false when any line could not be put back, including the silent
 * case: a release matching no row means the product row moved on and the units
 * are still missing. That is a different situation for the operator than a
 * clean release, and the caller words it differently.
 */
async function releaseStock(ctx: ToolContext, taken: ResolvedOrderLine[]): Promise<boolean> {
  if (taken.length === 0) return true;

  try {
    const results = await ctx.db.batch(
      taken.map((line) => {
        const { sql, params } = buildStockRestore(line);
        return ctx.db.prepare(sql).bind(...params);
      })
    );

    const missed = taken.filter((_, i) => !stockUpdateApplied(results[i]));
    if (missed.length > 0) {
      console.error(
        "createOrder: stock release matched no row — units still reserved against no order",
        missed.map((line) => ({
          product_id: line.productId,
          variant_id: line.variantId,
          quantity: line.quantity,
        }))
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("createOrder: stock release failed — units still reserved against no order", err);
    return false;
  }
}

/**
 * Reserves every line, or nothing. On refusal, the lines that did reserve are
 * released — and only those: crediting back a decrement that never applied
 * would invent stock, which is how a compensation turns into a second bug.
 */
async function reserveStock(
  ctx: ToolContext,
  lines: ResolvedOrderLine[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  let results: D1Result[];
  try {
    results = await ctx.db.batch(
      lines.map((line) => {
        const { sql, params } = buildStockDecrement(line);
        return ctx.db.prepare(sql).bind(...params);
      })
    );
  } catch (err) {
    // A statement that *fails* (as opposed to matching no row) rolls the whole
    // sequence back, so nothing was taken and there is nothing to release.
    console.error("createOrder: stock reservation batch failed, nothing reserved", err);
    return { ok: false, error: RESERVATION_UNAVAILABLE };
  }

  const refusedIndex = lines.findIndex((_, i) => !stockUpdateApplied(results[i]));
  if (refusedIndex === -1) return { ok: true };

  const reserved = lines.filter((_, i) => stockUpdateApplied(results[i]));
  const released = await releaseStock(ctx, reserved);
  const productName = lines[refusedIndex].productName;

  return {
    ok: false,
    error: released ? outOfStockReleased(productName) : outOfStockNotReleased(productName),
  };
}

export async function createOrder(
  ctx: ToolContext,
  params: { address: string; commune: string; phone: string; instructions?: string }
): Promise<ToolResult & { data?: unknown }> {
  if (ctx.session.is_verified !== 1 || !ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account before placing an order.",
    };
  }

  // Fetch cart items with the product's own figures. Prices are NOT read from
  // this query: the unit price is decided by resolveOrderLine below, from the
  // active variant when the product has any.
  const { results: cartItems } = await ctx.db
    .prepare(
      `SELECT wc.id as cart_item_id, p.id as product_id, wc.variant_id,
              p.name as product_name, p.base_price,
              p.stock_quantity as product_stock,
              p.is_active as product_is_active, p.is_draft as product_is_draft,
              wc.quantity
       FROM whatsapp_carts wc
       JOIN products p ON wc.product_id = p.id
       WHERE wc.session_id = ?`
    )
    .bind(ctx.session.id)
    .all<CartItemRow>();

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Your cart is empty. Add items before placing an order." };
  }

  // Fetch every ACTIVE variant of every product in the cart — not just the ones
  // referenced by a variant_id. This yields each product's activeVariantCount
  // without a second COUNT query, and guarantees a variant can only resolve for
  // a product actually in this cart.
  const productIds = [...new Set(cartItems.map((item) => item.product_id))];
  const placeholders = productIds.map(() => "?").join(",");
  const { results: activeVariantRows } = await ctx.db
    .prepare(
      `SELECT id, product_id, name, price, stock_quantity
       FROM product_variants
       WHERE product_id IN (${placeholders}) AND is_active = 1`
    )
    .bind(...productIds)
    .all<ActiveVariantRow>();

  const activeVariants = activeVariantRows ?? [];
  const variantById = new Map(activeVariants.map((v) => [v.id, v]));
  const activeVariantCountByProduct = countActiveVariantsByProduct(activeVariants);

  // Resolve the price and stock of every line. base_price is a display figure
  // for a product sold through variants, never a sellable price — a line with
  // no variant on such a product stops the order here.
  const lines: ResolvedOrderLine[] = [];

  for (const item of cartItems) {
    // is_active / is_draft are read as columns rather than filtered in the
    // JOIN on purpose: filtering would make the line vanish from the result
    // set and the order would go through for the remaining items, at a
    // quietly smaller total. The line must stop the order, not disappear.
    if (!isProductInCatalogue(item)) {
      return { success: false, error: productGoneFromCatalogue(item.product_name) };
    }

    let variant: ActiveVariantRow | null = null;
    if (item.variant_id) {
      const candidate = variantById.get(item.variant_id);
      if (!candidate || candidate.product_id !== item.product_id) {
        return { success: false, error: variantGoneFromCatalogue(item.product_name) };
      }
      variant = candidate;
    }

    const resolved = resolveOrderLine({
      product: {
        name: item.product_name,
        base_price: item.base_price,
        stock_quantity: item.product_stock,
        activeVariantCount: activeVariantCountByProduct.get(item.product_id) ?? 0,
      },
      variant: variant
        ? { name: variant.name, price: variant.price, stock_quantity: variant.stock_quantity }
        : null,
      quantity: item.quantity,
    });

    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    lines.push({
      productId: item.product_id,
      variantId: variant?.id ?? null,
      productName: item.product_name,
      variantName: variant?.name ?? null,
      unitPrice: resolved.unitPrice,
      quantity: item.quantity,
    });
  }

  // Look up delivery zone by commune
  const zone = await ctx.db
    .prepare(
      `SELECT id, fee, estimated_hours
       FROM delivery_zones
       WHERE commune = ? AND is_active = 1
       LIMIT 1`
    )
    .bind(params.commune)
    .first<DeliveryZoneRow>();

  if (!zone) {
    return {
      success: false,
      error: `No active delivery zone found for "${params.commune}". Please choose a different commune.`,
    };
  }

  // Calculate totals
  const subtotal = calculateSubtotal(lines);
  const deliveryFee = zone.fee;
  const total = subtotal + deliveryFee;

  // Reserve the stock first, in a batch of its own, and stop here if any line
  // is refused — see the block comment above reserveStock for why this cannot
  // ride in the same batch as the order write.
  const reservation = await reserveStock(ctx, lines);
  if (!reservation.ok) {
    return { success: false, error: reservation.error };
  }

  // Generate order number and id
  const orderId = generateId();
  const orderNumber = generateOrderNumber();

  // Estimate delivery date
  const estimatedDelivery = new Date(
    Date.now() + zone.estimated_hours * 60 * 60 * 1000
  ).toISOString();

  // Build batch statements: insert order + order_items + clear cart
  const insertOrder = ctx.db
    .prepare(
      `INSERT INTO orders (
         id, user_id, order_number, status, subtotal, delivery_fee, discount_amount,
         total, channel, delivery_address, delivery_commune, delivery_phone,
         delivery_instructions, estimated_delivery, created_at, updated_at
       ) VALUES (?, ?, ?, 'pending', ?, ?, 0, ?, 'whatsapp', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      orderId,
      ctx.session.user_id,
      orderNumber,
      subtotal,
      deliveryFee,
      total,
      params.address,
      params.commune,
      params.phone,
      params.instructions ?? null,
      estimatedDelivery
    );

  const insertItemStatements = lines.map((line) =>
    ctx.db
      .prepare(
        `INSERT INTO order_items (
           id, order_id, product_id, variant_id, product_name, variant_name,
           quantity, unit_price, total_price
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        orderId,
        line.productId,
        line.variantId,
        line.productName,
        line.variantName,
        line.quantity,
        line.unitPrice,
        line.quantity * line.unitPrice
      )
  );

  const clearCart = ctx.db
    .prepare(`DELETE FROM whatsapp_carts WHERE session_id = ?`)
    .bind(ctx.session.id);

  // The stock is already held at this point. If this batch fails, D1 rolls the
  // whole sequence back — no order, no lines, cart untouched — but the
  // reservation was a separate, already-committed batch and has to be undone
  // by hand, or those units stay held against an order that does not exist.
  try {
    await ctx.db.batch([insertOrder, ...insertItemStatements, clearCart]);
  } catch (err) {
    console.error(`createOrder: order write failed for ${orderNumber}, releasing reserved stock`, err);
    const released = await releaseStock(ctx, lines);
    return {
      success: false,
      error: released ? ORDER_WRITE_FAILED_RELEASED : ORDER_WRITE_FAILED_NOT_RELEASED,
    };
  }

  return {
    success: true,
    data: {
      order_number: orderNumber,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      estimated_delivery: estimatedDelivery,
      item_count: lines.length,
    },
  };
}

export async function getOrderStatus(
  ctx: ToolContext,
  params: { order_number: string }
): Promise<ToolResult & { data?: unknown }> {
  if (ctx.session.is_verified !== 1 || !ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account to view orders.",
    };
  }

  const order = await ctx.db
    .prepare(
      `SELECT id, order_number, status, total, created_at, estimated_delivery
       FROM orders
       WHERE order_number = ? AND user_id = ?`
    )
    .bind(params.order_number, ctx.session.user_id)
    .first<OrderRow>();

  if (!order) {
    return {
      success: false,
      error: `Order "${params.order_number}" not found or does not belong to your account.`,
    };
  }

  return {
    success: true,
    data: {
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      estimated_delivery: order.estimated_delivery,
    },
  };
}

export async function listOrders(
  ctx: ToolContext,
  params: { limit?: number }
): Promise<ToolResult & { data?: unknown }> {
  if (ctx.session.is_verified !== 1 || !ctx.session.user_id) {
    return {
      success: false,
      error: "Your account is not linked. Please link your account to view orders.",
    };
  }

  const limit = Math.max(1, Math.min(params.limit ?? 5, 10));

  const { results } = await ctx.db
    .prepare(
      `SELECT order_number, status, total, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(ctx.session.user_id, limit)
    .all<Pick<OrderRow, "order_number" | "status" | "total" | "created_at">>();

  return {
    success: true,
    data: {
      orders: results,
      count: results.length,
    },
  };
}
