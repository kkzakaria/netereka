import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { initAuth } from "@/lib/auth";

// better-auth serves this document under /api/auth/.well-known/… ; several MCP
// clients probe the site root first (RFC 8414 default), so mirror it here.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await initAuth();
  return oAuthDiscoveryMetadata(auth)(request);
}
