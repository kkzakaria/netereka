import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { getMcpResource, initAuth } from "@/lib/auth";
import { buildMcpContext, McpAuthError } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless, MCP 2026-07-28).
 *
 * requireMcpAuth vérifie le jeton d'accès JWT (signature via /api/auth/jwks,
 * émetteur, audience = mcpResourceUrl, expiration) ; sinon 401 +
 * WWW-Authenticate, ce qui permet au client de découvrir le flux OAuth.
 * buildMcpContext applique ensuite la règle métier — administrateur actif —
 * avant qu'aucun serveur n'existe. Un McpServer neuf par requête : rien à
 * partager entre isolats Workers, pas d'identifiant de session à stocker.
 *
 * Seul POST est exporté : GET et DELETE (sessions 2025) n'existent plus, Next
 * répond 405 de lui-même. `legacy: "reject"` refuse le protocole 2025.
 */
export const dynamic = "force-dynamic";

function jsonRpcError(status: number, code: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await initAuth();
  const handler = requireMcpAuth(
    auth,
    async (req, claims) => {
      let ctx;
      try {
        ctx = await buildMcpContext({
          userId: claims.sub,
          // `azp` = client autorisé (RFC 9068 / OIDC) ; `client_id` en repli.
          clientId: String(claims.azp ?? claims.client_id ?? ""),
        });
      } catch (err) {
        if (err instanceof McpAuthError) return jsonRpcError(403, -32000, err.message);
        console.error("[mcp] context build failed", err);
        return jsonRpcError(500, -32603, "Erreur interne");
      }
      return createMcpHandler(() => createMcpServer(ctx), { legacy: "reject" }).fetch(req);
    },
    { resource: await getMcpResource() },
  );
  return handler(request);
}
