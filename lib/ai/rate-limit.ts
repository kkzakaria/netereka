import { getKV } from "@/lib/cloudflare/context";

export const AI_GEN_MAX_PER_HOUR = 10;
const WINDOW_SEC = 3600;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Fixed 1-hour window, per-admin. Not exactly fair (bursts at window edges)
 * but trivial to implement on KV and sufficient as a cost ceiling.
 */
export async function checkRateLimit(adminId: string): Promise<RateLimitResult> {
  const kv = await getKV();
  if (!kv) throw new Error("KV namespace unavailable");

  const key = `ai_gen:${adminId}`;
  const current = await kv.get(key);
  const count = current ? Number(current) : 0;

  if (count >= AI_GEN_MAX_PER_HOUR) {
    return { ok: false, retryAfterSec: WINDOW_SEC };
  }

  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SEC });
  return { ok: true };
}
