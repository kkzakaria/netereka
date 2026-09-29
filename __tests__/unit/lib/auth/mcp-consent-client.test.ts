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

import { findOAuthClientName, parseConsentRequest } from "@/lib/auth/mcp-consent-client";

describe("findOAuthClientName", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("retourne le nom déclaré par le client, lu dans oauthClient", async () => {
    mocks.raw.mockResolvedValue([["Claude Desktop"]]);
    await expect(findOAuthClientName("https://claude.ai/oauth/client.json")).resolves.toBe("Claude Desktop");
    const stmt = mocks.bound.mock.calls[0][0] as { sql: string; params: unknown[] };
    expect(stmt.sql).toMatch(/from "oauthClient"/i);
    expect(stmt.params).toEqual(["https://claude.ai/oauth/client.json"]);
  });

  it("retourne null pour un client inconnu", async () => {
    mocks.raw.mockResolvedValue([]);
    await expect(findOAuthClientName("nope")).resolves.toBeNull();
  });

  it("retourne null quand le client n'a pas de nom", async () => {
    mocks.raw.mockResolvedValue([[null]]);
    await expect(findOAuthClientName("c")).resolves.toBeNull();
  });
});

describe("parseConsentRequest", () => {
  const base =
    "client_id=https%3A%2F%2Fclient.example%2Fcimd.json&redirect_uri=http%3A%2F%2Flocalhost%3A9999%2Fcb" +
    "&scope=openid+offline_access&exp=1&sig=abc";

  it("extrait client, hôtes et portées de la requête signée", () => {
    expect(parseConsentRequest(new URLSearchParams(base))).toEqual({
      clientId: "https://client.example/cimd.json",
      clientHost: "client.example",
      redirectHost: "localhost:9999",
      scopes: ["openid", "offline_access"],
    });
  });

  it("n'a pas d'hôte client quand le client_id n'est pas une URL", () => {
    const p = new URLSearchParams(base);
    p.set("client_id", "c1");
    expect(parseConsentRequest(p)?.clientHost).toBeNull();
  });

  it("retourne null sans signature (lien fabriqué à la main)", () => {
    const p = new URLSearchParams(base);
    p.delete("sig");
    expect(parseConsentRequest(p)).toBeNull();
  });

  it("retourne null quand client_id ou redirect_uri manquent", () => {
    expect(parseConsentRequest(new URLSearchParams("redirect_uri=http://x&sig=s"))).toBeNull();
    expect(parseConsentRequest(new URLSearchParams("client_id=c&sig=s"))).toBeNull();
  });

  it("retourne null quand redirect_uri n'est pas une URL", () => {
    const p = new URLSearchParams(base);
    p.set("redirect_uri", "pas une url");
    expect(parseConsentRequest(p)).toBeNull();
  });

  it("accepte une portée absente", () => {
    const p = new URLSearchParams(base);
    p.delete("scope");
    expect(parseConsentRequest(p)?.scopes).toEqual([]);
  });
});
