import { describe, it, expect } from "vitest";
import { checkOrderRateLimit } from "@/lib/rate-limit/orders";

function makeKV() {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => void store.set(k, v),
    delete: async (k: string) => void store.delete(k),
  };
}

describe("checkOrderRateLimit", () => {
  it("allows orders below the hourly cap", async () => {
    const kv = makeKV();
    for (let i = 0; i < 5; i++) {
      expect(await checkOrderRateLimit(kv as never, "user-1")).toBe(true);
    }
  });

  it("blocks the sixth order in the same window", async () => {
    const kv = makeKV();
    for (let i = 0; i < 5; i++) await checkOrderRateLimit(kv as never, "user-1");
    expect(await checkOrderRateLimit(kv as never, "user-1")).toBe(false);
  });

  it("counts each user independently", async () => {
    const kv = makeKV();
    for (let i = 0; i < 5; i++) await checkOrderRateLimit(kv as never, "user-1");
    expect(await checkOrderRateLimit(kv as never, "user-2")).toBe(true);
  });
});
