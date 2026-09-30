import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { getMcpResource, initAuth } from "@/lib/auth";
import { buildMcpContext, McpAuthError } from "@/lib/mcp/context";
import { serveJwksLocally } from "@/lib/mcp/local-jwks";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless, MCP 2026-07-28).
 *
 * requireMcpAuth vérifie le jeton d'accès JWT (signature via le JWKS,
 * émetteur, audience = mcpResourceUrl, expiration) ; sinon 401 +
 * WWW-Authenticate, ce qui permet au client de découvrir le flux OAuth.
 * buildMcpContext applique ensuite la règle métier — administrateur actif —
 * avant qu'aucun serveur n'existe. Un McpServer neuf par requête : rien à
 * partager entre isolats Workers, pas d'identifiant de session à stocker.
 *
 * Le JWKS n'est PAS récupéré sur Internet : un Worker qui appelle sa propre URL
 * publique échoue en production (voir lib/mcp/local-jwks.ts). Les clés sont
 * lues en mémoire via auth.api.getJwks().
 *
 * Seul POST est exporté : GET et DELETE (sessions 2025) n'existent plus, Next
 * répond 405 de lui-même. `legacy: "reject"` refuse le protocole 2025.
 */
export const dynamic = "force-dynamic";

function jsonRpcError(status: number, code: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status });
}

export async function POST(request: Request): Promise<Response> {
  // initAuth() peut lever (ex. SCHEMA_MISMATCH de better-auth 1.7 pendant un
  // canary) : on répond en JSON-RPC lisible plutôt qu'en 500 Next opaque.
  let auth;
  let resource;
  let baseURL;
  try {
    auth = await initAuth();
    resource = await getMcpResource();
    ({ baseURL } = await auth.$context);
  } catch (err) {
    console.error("[mcp] auth init failed", err);
    return jsonRpcError(500, -32603, "Service d'authentification indisponible");
  }
  // Même URL que le défaut de requireMcpAuth (`${baseURL}/jwks`), mais servie
  // en mémoire : la bibliothèque vérifie tout, seul le transport change.
  const jwksUrl = `${baseURL}/jwks`;
  serveJwksLocally(jwksUrl, () => auth.api.getJwks());
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
    { resource, jwksUrl },
  );
  return handler(request);
}
