import type { PromoCode } from "@/lib/db/types";

export interface DiscountResult {
  discount: number;
  label: string;
}

/**
 * Validate promo code eligibility (date range, usage limits, min order).
 * Returns an error message or null if valid.
 *
 * Note: does NOT check `is_active` — the caller must filter by
 * `is_active = 1` before calling this (e.g. via the SQL query).
 */
export function validatePromoEligibility(
  promo: PromoCode,
  subtotal: number,
  now: number = Date.now()
): string | null {
  if (promo.starts_at && now < new Date(promo.starts_at).getTime()) {
    return "Ce code promo n'est pas encore actif";
  }
  if (promo.expires_at && now > new Date(promo.expires_at).getTime()) {
    return "Ce code promo a expire";
  }
  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return "Ce code promo a atteint sa limite d'utilisation";
  }
  if (promo.min_order_amount && subtotal < promo.min_order_amount) {
    return `Montant minimum de commande: ${promo.min_order_amount} FCFA`;
  }
  return null;
}

/**
 * Calculate the discount amount and label for a promo code.
 * Discount is capped at the subtotal to prevent negative totals.
 */
export function calculateDiscount(
  discountType: "percentage" | "fixed",
  discountValue: number,
  subtotal: number
): DiscountResult {
  const rawDiscount =
    discountType === "percentage"
      ? Math.round((subtotal * discountValue) / 100)
      : discountValue;

  const discount = Math.min(rawDiscount, subtotal);

  const label =
    discountType === "percentage"
      ? `-${discountValue}%`
      : `-${discountValue} FCFA`;

  return { discount, label };
}

/**
 * Calculate the order total. Never goes below 0.
 */
export function calculateOrderTotal(
  subtotal: number,
  deliveryFee: number,
  discountAmount: number
): number {
  return Math.max(0, subtotal + deliveryFee - discountAmount);
}

/**
 * Calculate the subtotal from validated cart items.
 */
export function calculateSubtotal(
  items: Array<{ unitPrice: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

// ─── resolveOrderLine ───

export interface OrderLineProductInput {
  name: string;
  base_price: number;
  stock_quantity: number;
  /** Count of active (is_active = 1) variants for this product. */
  activeVariantCount: number;
}

export interface OrderLineVariantInput {
  name: string;
  price: number;
  stock_quantity: number;
}

export interface OrderLineInput {
  product: OrderLineProductInput;
  variant: OrderLineVariantInput | null;
  quantity: number;
}

export type OrderLineResult =
  | { ok: true; unitPrice: number; availableStock: number }
  | { ok: false; error: string };

/**
 * Resolves the unit price and stock check for a single order line.
 *
 * Security invariant: `base_price` is a display-only figure for products
 * sold through variants (the lowest of the variant prices), never an
 * actual sellable price. A null variant is only accepted when the product
 * has zero active variants; otherwise the caller must supply one of the
 * product's own active variants (ownership is the caller's responsibility —
 * this function only receives a variant already verified to belong to the
 * product).
 */
export function resolveOrderLine(input: OrderLineInput): OrderLineResult {
  const { product, variant, quantity } = input;

  if (variant) {
    if (variant.stock_quantity < quantity) {
      return {
        ok: false,
        error: `Stock insuffisant pour ${product.name} - ${variant.name} (${variant.stock_quantity} disponible(s))`,
      };
    }
    return { ok: true, unitPrice: variant.price, availableStock: variant.stock_quantity };
  }

  if (product.activeVariantCount > 0) {
    return {
      ok: false,
      error: `Veuillez sélectionner une variante pour ${product.name}`,
    };
  }

  if (product.stock_quantity < quantity) {
    return {
      ok: false,
      error: `Stock insuffisant pour ${product.name} (${product.stock_quantity} disponible(s))`,
    };
  }
  return { ok: true, unitPrice: product.base_price, availableStock: product.stock_quantity };
}

/**
 * Groups a flat list of already-active-filtered variants by their
 * product_id, returning how many active variants each product has.
 *
 * Pulled out of actions/checkout.ts (which builds this from a single query
 * fetching every active variant for every product in the cart) so the
 * counting logic that feeds resolveOrderLine's `activeVariantCount` guard
 * is itself unit-testable, independent of D1.
 */
export function countActiveVariantsByProduct(
  variants: Array<{ product_id: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of variants) {
    counts.set(v.product_id, (counts.get(v.product_id) ?? 0) + 1);
  }
  return counts;
}
