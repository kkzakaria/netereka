import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getMcpSession: vi.fn(),
  buildMcpContext: vi.fn(),
}));

// withMcpAuth (real, from better-auth) calls auth.api.getMcpSession and needs auth.options.
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    options: { baseURL: "https://netereka.ci", basePath: "/api/auth" },
    api: { getMcpSession: mocks.getMcpSession },
  }),
}));
vi.mock("@/lib/mcp/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mcp/context")>("@/lib/mcp/context");
  return { ...actual, buildMcpContext: mocks.buildMcpContext };
});
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { McpAuthError } from "@/lib/mcp/context";
import { POST, GET, DELETE } from "@/app/api/mcp/route";

function rpc(body: unknown, token = "tok") {
  return new Request("https://netereka.ci/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const INIT = {
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
};
const LIST = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMcpSession.mockResolvedValue({ userId: "u1", clientId: "c1", scopes: "openid" });
  mocks.buildMcpContext.mockResolvedValue({ user: { id: "u1", name: "Admin", role: "admin" }, clientId: "c1" });
});

describe("POST /api/mcp", () => {
  it("répond 401 avec WWW-Authenticate sans jeton valide", async () => {
    mocks.getMcpSession.mockResolvedValue(null);
    const res = await POST(rpc(LIST));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/resource_metadata=/);
    expect(mocks.buildMcpContext).not.toHaveBeenCalled();
  });

  it("répond 403 JSON-RPC quand le porteur du jeton n'est pas admin", async () => {
    mocks.buildMcpContext.mockRejectedValue(new McpAuthError("Accès réservé aux administrateurs"));
    const res = await POST(rpc(LIST));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Accès réservé aux administrateurs");
  });

  it("sert tools/list à un admin", async () => {
    const res = await POST(rpc(LIST));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { tools: { name: string }[] } };
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("create_product_draft");
    expect(names).toContain("list_categories");
    expect(names).toHaveLength(9);
  });

  it("accepte initialize sans identifiant de session (stateless)", async () => {
    const res = await POST(rpc(INIT));
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeNull();
    const body = (await res.json()) as { result: { serverInfo: { name: string } } };
    expect(body.result.serverInfo.name).toBe("netereka-admin");
  });
});

describe("GET/DELETE /api/mcp", () => {
  it("répondent 405", async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});
