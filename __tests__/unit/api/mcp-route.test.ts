import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const { BASE, RESOURCE, mocks } = vi.hoisted(() => ({
  BASE: "https://netereka.ci/api/auth",
  RESOURCE: "https://netereka.ci/api/mcp",
  mocks: { buildMcpContext: vi.fn(), getJwks: vi.fn() },
}));

// requireMcpAuth (réel, @better-auth/mcp) lit auth.$context pour l'émetteur et
// l'URL du JWKS ; le stockage anti-rejeu DPoP n'est touché que par les jetons DPoP.
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    options: {},
    api: { getJwks: mocks.getJwks },
    $context: Promise.resolve({ baseURL: BASE, internalAdapter: {} }),
  }),
  getMcpResource: vi.fn().mockResolvedValue(RESOURCE),
}));
vi.mock("@/lib/mcp/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mcp/context")>("@/lib/mcp/context");
  return { ...actual, buildMcpContext: mocks.buildMcpContext };
});
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { McpAuthError } from "@/lib/mcp/context";
import * as route from "@/app/api/mcp/route";

let privateKey: CryptoKey;
const realFetch = globalThis.fetch;
let networkJwksCalls = 0;

beforeAll(async () => {
  const pair = await generateKeyPair("EdDSA", { extractable: true });
  privateKey = pair.privateKey as CryptoKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "EdDSA" };
  mocks.getJwks.mockResolvedValue({ keys: [jwk] });
  // Régression de production : un Worker ne peut pas récupérer son propre JWKS
  // par HTTP (auto-sous-requête refusée, "Jwks failed"). Le JWKS doit donc venir
  // de auth.api.getJwks() en mémoire. Ce faux "réseau" échoue bruyamment et
  // compte les appels : l'ancien test servait le JWKS ici même, ce qui masquait
  // le défaut. Il est posé AVANT l'import de la route (installation de
  // l'enveloppe de fetch sur ce global).
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === `${BASE}/jwks`) {
      networkJwksCalls++;
      return new Response("error code: 1042", { status: 404 });
    }
    return realFetch(input, init);
  });
});

async function token(claims: { aud?: string; iss?: string; sub?: string; exp?: string } = {}) {
  return new SignJWT({ azp: "c1", client_id: "c1", scope: "openid" })
    .setProtectedHeader({ alg: "EdDSA", kid: "k1", typ: "at+jwt" })
    .setIssuer(claims.iss ?? BASE)
    .setAudience(claims.aud ?? RESOURCE)
    .setSubject(claims.sub ?? "u1")
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "5m")
    .sign(privateKey);
}

function rpc(body: unknown, bearer?: string) {
  return new Request(RESOURCE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const LIST = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.buildMcpContext.mockResolvedValue({ user: { id: "u1", name: "Admin", role: "admin" }, clientId: "c1" });
});

describe("POST /api/mcp — authentification", () => {
  it("répond 401 avec WWW-Authenticate pointant la métadonnée de la ressource, sans jeton", async () => {
    const res = await route.POST(rpc(LIST));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://netereka.ci/.well-known/oauth-protected-resource/api/mcp"',
    );
    expect(mocks.buildMcpContext).not.toHaveBeenCalled();
  });

  it("répond 401 pour un jeton lié à une autre ressource (audience)", async () => {
    const res = await route.POST(rpc(LIST, await token({ aud: "https://autre.example/mcp" })));
    expect(res.status).toBe(401);
    expect(mocks.buildMcpContext).not.toHaveBeenCalled();
  });

  it("répond 401 pour un jeton d'un autre émetteur", async () => {
    const res = await route.POST(rpc(LIST, await token({ iss: "https://evil.example/api/auth" })));
    expect(res.status).toBe(401);
  });

  it("répond 401 pour un jeton expiré", async () => {
    const res = await route.POST(rpc(LIST, await token({ exp: "-1m" })));
    expect(res.status).toBe(401);
  });

  it("répond 401 pour un jeton mal formé", async () => {
    const res = await route.POST(rpc(LIST, "pas-un-jwt"));
    expect(res.status).toBe(401);
  });

  it("vérifie le jeton avec les clés lues en mémoire, sans jamais requêter le JWKS en HTTP", async () => {
    networkJwksCalls = 0;
    const res = await route.POST(rpc(LIST, await token()));
    expect(res.status).not.toBe(401);
    expect(mocks.buildMcpContext).toHaveBeenCalled();
    expect(networkJwksCalls).toBe(0);
  });

  it("transmet sub et azp du jeton à buildMcpContext", async () => {
    await route.POST(rpc(LIST, await token({ sub: "user-42" })));
    expect(mocks.buildMcpContext).toHaveBeenCalledWith({ userId: "user-42", clientId: "c1" });
  });

  it("répond 403 JSON-RPC quand le porteur du jeton n'est pas admin", async () => {
    mocks.buildMcpContext.mockRejectedValue(new McpAuthError("Accès réservé aux administrateurs"));
    const res = await route.POST(rpc(LIST, await token()));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Accès réservé aux administrateurs");
  });
});

describe("POST /api/mcp — protocole 2026-07-28 uniquement", () => {
  it("rejette le protocole 2025 (initialize) avec la liste des versions prises en charge", async () => {
    const init = {
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } },
    };
    const res = await route.POST(rpc(init, await token()));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { data: { supported: string[] } } };
    expect(body.error.data.supported).toEqual(["2026-07-28"]);
  });

  it("sert les dix-huit outils à un vrai client MCP moderne, jeton signé à l'appui", async () => {
    const bearer = await token();
    const client = new Client({ name: "test", version: "0" }, { versionNegotiation: { mode: "auto" } });
    const transport = new StreamableHTTPClientTransport(new URL(RESOURCE), {
      requestInit: { headers: { authorization: `Bearer ${bearer}` } },
      fetch: async (input, init) => route.POST(new Request(input as string | URL, init)),
    });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(18);
      expect(tools.map((t) => t.name)).toContain("create_product_draft");
      expect(client.getServerVersion()?.name).toBe("netereka-admin");
    } finally {
      await client.close();
    }
  });
});

describe("POST /api/mcp — défaillance de l'auth", () => {
  it("répond en JSON-RPC 500 (pas en 500 Next opaque) quand initAuth échoue", async () => {
    const { initAuth } = await import("@/lib/auth");
    vi.mocked(initAuth).mockRejectedValueOnce(new Error("SCHEMA_MISMATCH"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await route.POST(rpc(LIST, await token()));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { jsonrpc: string; error: { code: number } };
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error.code).toBe(-32603);
  });
});

describe("/api/mcp — méthodes", () => {
  it("n'exporte que POST : GET et DELETE reviennent à Next (405)", () => {
    expect(Object.keys(route).filter((k) => ["GET", "DELETE", "PUT", "PATCH", "HEAD", "OPTIONS"].includes(k))).toEqual([]);
    expect(typeof route.POST).toBe("function");
  });
});
