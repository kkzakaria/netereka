import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

const MAX_PROMO_CHECKS_PER_HOUR = 20;
const WINDOW_SECONDS = 3600;

/**
 * Per-user throttle on promo code validation (validatePromoCode). Same
 * key/identity rationale as checkOrderRateLimit (lib/rate-limit/orders.ts):
 * keyed on the authenticated user id alone, never IP, since CGNAT on
 * Ivorian mobile carriers puts many genuine customers behind one IP.
 *
 * The ceiling is higher than order creation's (5/hour) because entering a
 * promo code is a legitimate action a customer repeats often — retyping a
 * mistyped code, trying a code shared by a friend, checking eligibility
 * while still adjusting their cart. 20/hour keeps that experience intact
 * while still bounding how many codes a single account can probe.
 *
 * Reuses the generic checkKVRateLimit primitive from task 3.2 unchanged —
 * this file only supplies its own key prefix and ceiling.
 */
export async function checkPromoRateLimit(kv: KVNamespace, userId: string): Promise<boolean> {
  return checkKVRateLimit(kv, `promo:rate:${userId}`, {
    max: MAX_PROMO_CHECKS_PER_HOUR,
    windowSeconds: WINDOW_SECONDS,
  });
}
