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
 *
 * The window is genuinely fixed, not sliding: storage is `{ count, resetAt }`
 * and `resetAt` is captured once, on the first accepted call of each window,
 * then left untouched by every later call in that same window. This mirrors
 * `lib/ai/rate-limit.ts`'s documented trade-off exactly (see that file for
 * the fuller rationale) — an earlier version of this function re-`put` the
 * entry with a fresh `expirationTtl: windowSeconds` on every accepted call,
 * which slides the expiry forward each time and means a caller whose calls
 * are spaced closer together than the window never actually resets: five
 * calls at fifty-five-minute intervals blocks the sixth call four and a half
 * hours after the first, not one hour after. Storing `resetAt` and computing
 * the *remaining* TTL on each write (`resetAt - now`, never the full window)
 * fixes that: the window closes on its original schedule regardless of how
 * many accepted calls land inside it.
 */
export interface KVRateLimitOptions {
  /** Maximum allowed calls within the window (inclusive). */
  max: number;
  /** Window length in seconds; also used as the KV entry's expirationTtl. */
  windowSeconds: number;
}

interface Bucket {
  count: number;
  /** Epoch ms at which this window closes and a fresh one starts. */
  resetAt: number;
}

export async function checkKVRateLimit(
  kv: KVNamespace,
  key: string,
  { max, windowSeconds }: KVRateLimitOptions,
  now: number = Date.now()
): Promise<boolean> {
  const raw = await kv.get(key);
  const bucket = raw ? safeParseBucket(raw) : null;

  // No bucket yet, or the previous window already closed: start a fresh
  // fixed window. Also the safe fallback for a pre-migration value written
  // by the old plain-counter format (a bare numeric string fails to parse
  // as a Bucket) — same "repart à zéro" tolerance lib/ai/rate-limit.ts
  // already applies to malformed KV values.
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
    // Floored at 60 for the same reason as the accepted-call write below: KV
    // rejects any expirationTtl under 60 seconds outright, so a caller
    // configured with a sub-minute window would have thrown here on its very
    // first call — the floor was applied to the second write only. No current
    // caller uses a window that short (600s is the shortest), so this was
    // latent rather than live, but it made the module unusable for the one
    // shape a rate limiter is most often asked for. Flooring is safe because
    // `resetAt`, not the KV TTL, defines the window: the branch guarding this
    // block already treats `resetAt <= now` as expired regardless of whether
    // the KV entry itself has gone.
    await kv.put(key, JSON.stringify(fresh), {
      expirationTtl: Math.max(60, windowSeconds),
    });
    return true;
  }

  if (bucket.count >= max) return false;

  // Accepted: increment the count but never touch resetAt, and set the
  // KV entry's TTL to the window's *remaining* time, not the full window —
  // this is what keeps the window fixed instead of sliding.
  //
  // Floored at 60, not 1: Cloudflare KV rejects any expirationTtl below 60
  // seconds outright (kv.put throws), and a call landing in the final 59
  // seconds of a window would otherwise compute exactly that. Flooring is
  // safe because resetAt, not the KV TTL, is what actually defines the
  // window: the branch above already treats any bucket with `resetAt <= now`
  // as expired and starts a fresh window regardless of whether the KV entry
  // itself has expired yet. Over-extending the entry's real expiry a little
  // past resetAt only means it lingers slightly longer before the next call
  // naturally overwrites or lets it expire — it can never make the window
  // look open past resetAt.
  const updated: Bucket = { count: bucket.count + 1, resetAt: bucket.resetAt };
  const remainingSeconds = Math.max(60, Math.ceil((bucket.resetAt - now) / 1000));
  await kv.put(key, JSON.stringify(updated), { expirationTtl: remainingSeconds });
  return true;
}

function safeParseBucket(raw: string): Bucket | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof (parsed as Bucket).count === "number" &&
      typeof (parsed as Bucket).resetAt === "number"
    ) {
      return parsed as Bucket;
    }
  } catch {
    /* fall through */
  }
  return null;
}
