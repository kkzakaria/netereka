import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ raw: vi.fn(), bound: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => ({
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => {
        const stmt = { sql, params };
        mocks.bound(stmt);
        return {
          run: async () => ({ success: true, meta: {}, results: [] }),
          all: async () => ({ results: await mocks.raw(stmt) }),
          raw: () => mocks.raw(stmt),
        };
      },
    }),
    batch: async () => [],
  }),
}));

import { findOAuthClientName } from "@/lib/auth/mcp-consent-client";

describe("findOAuthClientName", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("retourne le nom du client enregistré", async () => {
    mocks.raw.mockResolvedValue([["Claude Desktop"]]);
    await expect(findOAuthClientName("client-1")).resolves.toBe("Claude Desktop");
    const stmt = mocks.bound.mock.calls[0][0] as { sql: string; params: unknown[] };
    expect(stmt.sql).toMatch(/from "oauthApplication"/i);
    expect(stmt.params).toEqual(["client-1"]);
  });

  it("retourne null pour un client inconnu", async () => {
    mocks.raw.mockResolvedValue([]);
    await expect(findOAuthClientName("nope")).resolves.toBeNull();
  });
});
