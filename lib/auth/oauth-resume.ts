const REQUIRED_PARAMS = ["client_id", "redirect_uri", "response_type"] as const;

/**
 * The better-auth `mcp` plugin sends an unauthenticated /mcp/authorize caller
 * to `/admin/login?<original OAuth query>`. After sign-in the browser must go
 * back to the authorize endpoint with that same query so the flow continues
 * (and lands on the consent page). Same-origin path, hardcoded on purpose.
 */
export function getOAuthResumeUrl(params: URLSearchParams): string | null {
  for (const key of REQUIRED_PARAMS) {
    if (!params.get(key)) return null;
  }
  return `/api/auth/mcp/authorize?${params.toString()}`;
}
