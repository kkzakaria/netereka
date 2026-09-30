import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { initAuth } from "@/lib/auth";

// L'émetteur (issuer) est https://<site>/api/auth : la découverte RFC 8414 insère
// le chemin de l'émetteur après /.well-known/oauth-authorization-server (route
// ./api/auth/route.ts). Cette variante racine reste servie pour les clients qui
// sondent d'abord la racine du site.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await initAuth();
  return oauthProviderAuthServerMetadata(auth)(request);
}
