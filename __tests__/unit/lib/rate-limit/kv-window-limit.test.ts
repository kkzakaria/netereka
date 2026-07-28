import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

// Fixed-window behaviour: a bucket is `{ count, resetAt }` in KV, `resetAt`
// is set once on the first accepted call of a window and never touched by
// later accepted calls. This pins that contract down — see the doc comment
// in lib/rate-limit/kv-window-limit.ts and lib/ai/rate-limit.ts for the
// same trade-off documented independently.

const NOW = 1_000_000_000_000; // fixed epoch for deterministic resetAt
const WINDOW_SECONDS = 3600;
const WINDOW_MS = WINDOW_SECONDS * 1000;

function makeKV(initial: Map<string, string> = new Map()) {
  const store = new Map(initial);
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    _store: store,
  } as unknown as KVNamespace & {
    put: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    _store: Map<string, string>;
  };
}

function bucket(count: number, resetAt: number): string {
  return JSON.stringify({ count, resetAt });
}

describe("checkKVRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows the first call (no bucket) and opens a fixed window", async () => {
    const kv = makeKV();

    const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      "k",
      bucket(1, NOW + WINDOW_MS),
      expect.objectContaining({ expirationTtl: WINDOW_SECONDS })
    );
  });

  it("allows up to max calls within the window", async () => {
    const kv = makeKV(new Map([["k", bucket(4, NOW + WINDOW_MS)]]));

    const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(true);
  });

  it("rejects the (max + 1)th call within the window", async () => {
    const kv = makeKV(new Map([["k", bucket(5, NOW + WINDOW_MS)]]));

    const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("starts a fresh window once the previous one has closed", async () => {
    const kv = makeKV(new Map([["k", bucket(5, NOW - 1)]])); // window already closed

    const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      "k",
      bucket(1, NOW + WINDOW_MS),
      expect.objectContaining({ expirationTtl: WINDOW_SECONDS })
    );
  });

  // This is the regression test for the fix: an earlier implementation
  // re-put the entry with `expirationTtl: windowSeconds` (the *full* window)
  // on every accepted call, which slides `resetAt` forward every time —
  // a call accepted late in the window would extend it instead of leaving it
  // fixed. This test fails against that implementation because it would
  // observe a `put` for the full 3600s TTL (and an implicit resetAt of
  // `NOW + WINDOW_MS`) instead of the ~1s remaining in the real window.
  it("does not extend the window on a call accepted late in it (fixed, not sliding)", async () => {
    const originalReset = NOW + 1_000; // 1 second left in the window
    const kv = makeKV(new Map([["k", bucket(2, originalReset)]]));

    const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(true);
    // resetAt is preserved from the original bucket, and the TTL written
    // reflects only the ~1s actually remaining, not the full 3600s window.
    expect(kv.put).toHaveBeenCalledWith(
      "k",
      bucket(3, originalReset),
      expect.objectContaining({ expirationTtl: 1 })
    );
  });

  it("concretely: a customer who reaches the cap always recovers within one window of the FIRST call, never later", async () => {
    // Reproduces the shape of the brief's failure scenario. Under the old
    // slide-on-every-write behaviour, each accepted call reset the KV entry's
    // expirationTtl to a full windowSeconds from that call's own time — so a
    // burst of accepted calls spaced under the window apart kept pushing the
    // entry's real expiry further into the future than "one window after the
    // first call" (the brief's concrete case: 5 calls 55 minutes apart delays
    // recovery to 4.5h after the first call, not 1h). With the fixed window,
    // four calls in quick succession (all well inside the same window) must
    // still leave the bucket's resetAt anchored to the FIRST call, and the
    // cap must free up exactly one window after that first call — not later,
    // no matter how many accepted calls landed in between.
    const kv = makeKV();
    const tenMin = 10 * 60 * 1000;

    let t = NOW;
    for (let i = 0; i < 4; i++) {
      const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, t);
      expect(ok).toBe(true);
      t += tenMin; // NOW, +10, +20, +30 min — all comfortably inside the 60min window
    }

    // resetAt must still be anchored to the very first call (NOW + 1h), not
    // slid forward by any of the 3 subsequent accepted calls.
    const stored = JSON.parse(kv._store.get("k") as string) as { count: number; resetAt: number };
    expect(stored.resetAt).toBe(NOW + WINDOW_MS);
    expect(stored.count).toBe(4);

    // A 5th call, still inside the original window, is accepted (count 4 < max 5)...
    const fifth = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, t);
    expect(fifth).toBe(true);

    // ...and now the cap is hit: a 6th call one tick before the original
    // window closes is rejected...
    const sixthWithinWindow = await checkKVRateLimit(
      kv,
      "k",
      { max: 5, windowSeconds: WINDOW_SECONDS },
      NOW + WINDOW_MS - 1
    );
    expect(sixthWithinWindow).toBe(false);

    // ...but recovers exactly one window after the FIRST call, not hours
    // later as the slide-on-write bug would have caused.
    const afterOriginalWindow = await checkKVRateLimit(
      kv,
      "k",
      { max: 5, windowSeconds: WINDOW_SECONDS },
      NOW + WINDOW_MS + 1
    );
    expect(afterOriginalWindow).toBe(true);
  });

  it("isolates counters by key", async () => {
    const kv = makeKV(new Map([["order:rate:user-1", bucket(5, NOW + WINDOW_MS)]]));

    const ok = await checkKVRateLimit(kv, "order:rate:user-2", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(true);
  });

  it("tolerates a pre-migration plain-counter value (old format) by starting fresh", async () => {
    // The previous implementation stored a bare numeric string (`String(n)`),
    // not JSON. A value written before this fix must not crash the parser —
    // it should be treated like any other malformed value: start fresh.
    const kv = makeKV(new Map([["k", "3"]]));

    const ok = await checkKVRateLimit(kv, "k", { max: 5, windowSeconds: WINDOW_SECONDS }, NOW);

    expect(ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      "k",
      bucket(1, NOW + WINDOW_MS),
      expect.objectContaining({ expirationTtl: WINDOW_SECONDS })
    );
  });
});
