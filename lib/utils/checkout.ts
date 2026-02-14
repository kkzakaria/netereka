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
