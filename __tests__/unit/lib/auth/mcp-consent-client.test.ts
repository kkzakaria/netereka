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

import { findOAuthClientName, findConsentRequest } from "@/lib/auth/mcp-consent-client";

/** Routes the mocked D1 driver by table name so a test can queue rows for the
 * `verification` select and, separately, for the `oauthApplication` select
 * that `findConsentRequest` issues afterwards to resolve the client name. */
function mockRowsFor(verificationRows: unknown[], clientRows: unknown[]) {
  mocks.raw.mockImplementation(async (stmt: { sql: string }) => {
    if (/from "verification"/i.test(stmt.sql)) return verificationRows;
    if (/from "oauthApplication"/i.test(stmt.sql)) return clientRows;
    throw new Error(`unexpected query: ${stmt.sql}`);
  });
}

function verificationValue(overrides: Partial<Record<string, unknown>> = {}) {
  return JSON.stringify({
    clientId: "client-1",
    redirectURI: "http://localhost:9999/callback",
    scope: ["mcp:products:draft"],
    userId: "user-1",
    authTime: 0,
    requireConsent: true,
    state: null,
    codeChallenge: "challenge",
    codeChallengeMethod: "S256",
    ...overrides,
  });
}

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

describe("findConsentRequest", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("résout la demande de consentement à partir du code", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockRowsFor([[verificationValue(), future]], [["Claude Desktop"]]);

    await expect(findConsentRequest("code-1")).resolves.toEqual({
      clientId: "client-1",
      clientName: "Claude Desktop",
      redirectHost: "localhost:9999",
      scopes: ["mcp:products:draft"],
    });
  });

  it("retourne null quand le code a expiré", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    mockRowsFor([[verificationValue(), past]], [["Claude Desktop"]]);

    await expect(findConsentRequest("code-1")).resolves.toBeNull();
  });

  it("retourne null quand requireConsent est faux", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockRowsFor([[verificationValue({ requireConsent: false }), future]], [["Claude Desktop"]]);

    await expect(findConsentRequest("code-1")).resolves.toBeNull();
  });

  it("retourne null quand le code est introuvable", async () => {
    mockRowsFor([], [["Claude Desktop"]]);

    await expect(findConsentRequest("missing")).resolves.toBeNull();
  });

  it("retourne null quand la valeur stockée est du JSON invalide", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockRowsFor([["not-json", future]], [["Claude Desktop"]]);

    await expect(findConsentRequest("code-1")).resolves.toBeNull();
  });
});
