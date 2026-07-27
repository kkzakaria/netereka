import { describe, it, expect, vi, beforeEach } from "vitest";

// This route has no automatic trigger yet (see route.ts's top comment for
// why: OpenNext 1.19.1 does not expose a scheduled() handler alongside the
// Next.js worker). It exists as the securable, invokable surface for the
// reaper regardless of what ends up calling it.

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  reapStalePendingOrders: vi.fn(),
}));

vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));
vi.mock("@/lib/db/orders", () => ({ reapStalePendingOrders: mocks.reapStalePendingOrders }));

import { POST } from "@/app/api/cron/reap-pending-orders/route";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/reap-pending-orders", {
    method: "POST",
    headers,
  });
}

describe("POST /api/cron/reap-pending-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockResolvedValue({ CRON_SECRET: "s3cr3t" });
    mocks.reapStalePendingOrders.mockResolvedValue({ cancelled: 2, skipped: 0, total: 2 });
  });

  it("rejects a request with no Authorization header", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mocks.reapStalePendingOrders).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong secret", async () => {
    const res = await POST(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(mocks.reapStalePendingOrders).not.toHaveBeenCalled();
  });

  it("rejects every request when CRON_SECRET is not configured", async () => {
    mocks.getEnv.mockResolvedValue({});
    const res = await POST(req({ authorization: "Bearer s3cr3t" }));
    expect(res.status).toBe(401);
    expect(mocks.reapStalePendingOrders).not.toHaveBeenCalled();
  });

  it("runs the reaper and returns its counts when the secret matches", async () => {
    const res = await POST(req({ authorization: "Bearer s3cr3t" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cancelled: 2, skipped: 0, total: 2 });
    expect(mocks.reapStalePendingOrders).toHaveBeenCalledTimes(1);
  });
});
