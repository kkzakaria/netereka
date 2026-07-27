import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

const MAX_ORDERS_PER_HOUR = 5;
const WINDOW_SECONDS = 3600;

/**
 * Per-user throttle on order creation. Keyed on the authenticated user id
 * only (createOrder always runs behind requireAuth, so every caller already
 * has a stable, non-spoofable identity) — not on client IP. Ivorian mobile
 * carriers commonly put many genuine customers behind the same
 * cf-connecting-ip via CGNAT, so an IP-keyed cap would risk throttling
 * unrelated customers for a marginal gain: the exploit this closes is a
 * single account driving stock to zero, which the user-id key already
 * defeats directly.
 */
export async function checkOrderRateLimit(kv: KVNamespace, userId: string): Promise<boolean> {
  return checkKVRateLimit(kv, `order:rate:${userId}`, {
    max: MAX_ORDERS_PER_HOUR,
    windowSeconds: WINDOW_SECONDS,
  });
}
