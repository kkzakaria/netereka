import { describe, expect, it, vi, beforeEach } from "vitest";

const getKVMock = vi.fn();
vi.mock("@/lib/cloudflare/context", () => ({ getKV: () => getKVMock() }));

import { checkRateLimit, AI_GEN_MAX_PER_HOUR } from "@/lib/ai/rate-limit";

function makeKV(initial: Map<string, string> = new Map()) {
  const store = new Map(initial);
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    _store: store,
  };
}

describe("checkRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("autorise la première génération", async () => {
    const kv = makeKV();
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1");

    expect(r.ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith("ai_gen:admin-1", "1", expect.objectContaining({ expirationTtl: 3600 }));
  });

  it(`autorise jusqu'à ${AI_GEN_MAX_PER_HOUR} générations`, async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", String(AI_GEN_MAX_PER_HOUR - 1)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1");
    expect(r.ok).toBe(true);
  });

  it(`rejette la ${AI_GEN_MAX_PER_HOUR + 1}ème génération`, async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", String(AI_GEN_MAX_PER_HOUR)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("isole les buckets par admin", async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", String(AI_GEN_MAX_PER_HOUR)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-2");
    expect(r.ok).toBe(true);
  });
});
