/**
 * better-auth's `mcp` plugin (1.6.25) issues an authorization code without any
 * consent screen as soon as the user has a session, unless the client sends
 * `prompt=consent` (node_modules/better-auth/dist/plugins/mcp/authorize.mjs,
 * `if (query.prompt !== "consent")`). Dynamic client registration is open — it
 * has to be, claude.ai and ChatGPT register themselves — so without this hook a
 * malicious site could register a client with its own redirect URI, send a
 * signed-in admin to the authorize URL, and collect an admin token silently.
 *
 * Forcing `prompt=consent` on every /mcp/authorize request routes the flow
 * through `oidcConfig.consentPage`, where a human must click "Autoriser".
 *
 * Pure function so the rule is unit-testable without a better-auth context.
 */
export const MCP_AUTHORIZE_PATH = "/mcp/authorize";

export function forceConsentQuery(
  path: string | undefined,
  query: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (path !== MCP_AUTHORIZE_PATH) return undefined;
  return { ...(query ?? {}), prompt: "consent" };
}
