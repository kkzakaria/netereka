import { withMcpAuth } from "better-auth/plugins";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { initAuth } from "@/lib/auth";
import { buildMcpContext, McpAuthError } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless).
 *
 * withMcpAuth validates the OAuth bearer token (401 + WWW-Authenticate
 * otherwise, which is how clients discover the OAuth flow). buildMcpContext
 * then enforces the business rule — active admin — before any server exists.
 * A fresh McpServer + transport per request: nothing to share between Workers
 * isolates, no session id to store.
 */
export const dynamic = "force-dynamic";

function jsonRpcError(status: number, code: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await initAuth();
  const handler = withMcpAuth(auth, async (req, session) => {
    let ctx;
    try {
      ctx = await buildMcpContext({ userId: session.userId, clientId: session.clientId });
    } catch (err) {
      if (err instanceof McpAuthError) return jsonRpcError(403, -32000, err.message);
      console.error("[mcp] context build failed", err);
      return jsonRpcError(500, -32603, "Erreur interne");
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      // Plain JSON responses: tools answer in one shot, no server-push needed,
      // and it keeps the response cacheable-by-nobody and easy to test.
      enableJsonResponse: true,
    });
    const server = createMcpServer(ctx);
    await server.connect(transport);
    try {
      return await transport.handleRequest(req);
    } finally {
      // Stateless: release the per-request server once the response is built.
      void transport.close().catch(() => {});
    }
  });
  return handler(request);
}

// Stateless mode has no standalone SSE stream and no session to delete.
export async function GET(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}

export async function DELETE(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
