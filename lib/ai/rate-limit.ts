import { getKV } from "@/lib/cloudflare/context";

export const AI_GEN_MAX_PER_HOUR = 10;
const WINDOW_SEC = 3600;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

type Bucket = { count: number; resetAt: number };

/**
 * Fixed 1-hour window, per-admin. Storage is `{ count, resetAt }` in KV — resetAt is captured
 * on the first increment of each window and not extended on subsequent increments, so the
 * window really is fixed (unlike `putting with expirationTtl` on every write, which would
 * slide it). On window expiry a fresh bucket is started.
 *
 * Concurrency: KV has no atomic increment, so two parallel requests within the same tick can
 * both pass the check and exceed the cap by 1-2. This is acceptable as a cost ceiling — the
 * worst case is ~12 generations/hour per admin instead of 10.
 */
export async function checkRateLimit(
  adminId: string,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const kv = await getKV();
  if (!kv) throw new Error("KV namespace unavailable");

  const key = `ai_gen:${adminId}`;
  const raw = await kv.get(key);
  const bucket: Bucket | null = raw ? safeParse(raw) : null;

  // No bucket, or previous window already expired → start a new one.
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + WINDOW_SEC * 1000 };
    await kv.put(key, JSON.stringify(fresh), { expirationTtl: WINDOW_SEC });
    return { ok: true };
  }

  if (bucket.count >= AI_GEN_MAX_PER_HOUR) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  const updated: Bucket = { count: bucket.count + 1, resetAt: bucket.resetAt };
  const remaining = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  await kv.put(key, JSON.stringify(updated), { expirationTtl: remaining });
  return { ok: true };
}

function safeParse(raw: string): Bucket | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof (parsed as Bucket).count === "number" &&
      typeof (parsed as Bucket).resetAt === "number"
    ) {
      return parsed as Bucket;
    }
  } catch { /* fall through */ }
  return null;
}
