import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { initAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await initAuth();
  return oAuthProtectedResourceMetadata(auth)(request);
}
