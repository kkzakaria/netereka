/**
 * Generic best-effort fixed-window counter backed by a KV namespace.
 *
 * KV is eventually consistent, so highly concurrent requests can slightly
 * exceed `max` under race conditions — accepted here: the goal is to make
 * abuse (e.g. draining stock, brute-forcing a promo code) impractical, not
 * to count exactly. The WhatsApp bot already relies on the same trade-off.
 *
 * Shared by every per-domain limiter (orders, promo codes, ...) so each one
 * only has to supply its own key prefix and ceiling — the counting logic
 * itself lives in one place.
 */
export interface KVRateLimitOptions {
  /** Maximum allowed calls within the window (inclusive). */
  max: number;
  /** Window length in seconds; also used as the KV entry's expirationTtl. */
  windowSeconds: number;
}

export async function checkKVRateLimit(
  kv: KVNamespace,
  key: string,
  { max, windowSeconds }: KVRateLimitOptions
): Promise<boolean> {
  const current = Number((await kv.get(key)) ?? 0);
  if (current >= max) return false;
  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}
