import { initAuth } from "@/lib/auth";

// mcp() sert ce document lui-même (RFC 9728), mais seulement pour les requêtes
// qui traversent auth.handler ; le routeur Next n'envoie ici que /api/auth/*.
// On transmet donc la requête telle quelle : le chemin /.well-known/... est celui
// que le plugin reconnaît. Alias racine ; la variante « avec chemin de la
// ressource » est dans ./api/mcp/route.ts.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await initAuth();
  return auth.handler(request);
}
