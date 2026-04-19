import { describe, expect, it, vi, beforeEach } from "vitest";

const getKVMock = vi.fn();
vi.mock("@/lib/cloudflare/context", () => ({ getKV: () => getKVMock() }));

import { checkRateLimit, AI_GEN_MAX_PER_HOUR } from "@/lib/ai/rate-limit";

const NOW = 1_000_000_000_000; // fixed epoch for deterministic resetAt
const WINDOW_MS = 3_600_000;

function makeKV(initial: Map<string, string> = new Map()) {
  const store = new Map(initial);
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    _store: store,
  };
}

function bucket(count: number, resetAt: number): string {
  return JSON.stringify({ count, resetAt });
}

describe("checkRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("autorise la première génération (pas de bucket)", async () => {
    const kv = makeKV();
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1", NOW);

    expect(r.ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      "ai_gen:admin-1",
      bucket(1, NOW + WINDOW_MS),
      expect.objectContaining({ expirationTtl: 3600 }),
    );
  });

  it("démarre un nouveau bucket si l'ancien a expiré", async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", bucket(AI_GEN_MAX_PER_HOUR, NOW - 1)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1", NOW);
    expect(r.ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      "ai_gen:admin-1",
      bucket(1, NOW + WINDOW_MS),
      expect.objectContaining({ expirationTtl: 3600 }),
    );
  });

  it("n'étend pas le resetAt sur un incrément (fenêtre vraiment fixe)", async () => {
    const originalReset = NOW + 1_800_000; // 30 min left
    const kv = makeKV(new Map([["ai_gen:admin-1", bucket(3, originalReset)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1", NOW);
    expect(r.ok).toBe(true);
    // resetAt preserved; ttl reflects remaining window, not full 3600
    expect(kv.put).toHaveBeenCalledWith(
      "ai_gen:admin-1",
      bucket(4, originalReset),
      expect.objectContaining({ expirationTtl: 1800 }),
    );
  });

  it(`autorise jusqu'à ${AI_GEN_MAX_PER_HOUR} générations`, async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", bucket(AI_GEN_MAX_PER_HOUR - 1, NOW + WINDOW_MS)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1", NOW);
    expect(r.ok).toBe(true);
  });

  it(`rejette la ${AI_GEN_MAX_PER_HOUR + 1}ème génération avec retryAfterSec précis`, async () => {
    const resetAt = NOW + 1_500_000; // 25 min = 1500s remaining
    const kv = makeKV(new Map([["ai_gen:admin-1", bucket(AI_GEN_MAX_PER_HOUR, resetAt)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1", NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBe(1500);
  });

  it("isole les buckets par admin", async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", bucket(AI_GEN_MAX_PER_HOUR, NOW + WINDOW_MS)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-2", NOW);
    expect(r.ok).toBe(true);
  });

  it("tolère une valeur KV malformée (repart à zéro)", async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", "not-json"]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1", NOW);
    expect(r.ok).toBe(true);
  });
});
