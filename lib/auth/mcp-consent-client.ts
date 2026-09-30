import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { oauthClient } from "@/lib/db/schema";

/**
 * Nom qu'un client OAuth s'est donné dans son document de métadonnées (CIMD).
 * Non fiable : à afficher échappé, jamais comme identité. L'identité du client
 * est son `client_id`, l'URL HTTPS de son document.
 */
export async function findOAuthClientName(clientId: string): Promise<string | null> {
  const db = await getDrizzle();
  // Pas de .limit(1) : clientId est unique dans le schéma, le filtre renvoie au
  // plus une ligne — et drizzle-orm/d1 lie LIMIT comme paramètre de requête.
  const row = await db
    .select({ name: oauthClient.name })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .get();
  return row?.name ?? null;
}

export interface ConsentRequest {
  clientId: string;
  /** Hôte du client_id quand c'est une URL (CIMD), sinon null. */
  clientHost: string | null;
  redirectHost: string;
  scopes: string[];
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Lit la demande d'autorisation dans la requête OAuth signée que le fournisseur
 * passe à la page de consentement (client_id, redirect_uri, scope, exp, sig).
 *
 * Ces valeurs ne sont PAS authentifiées ici : n'importe qui peut fabriquer un
 * lien vers la page. Elles ne servent qu'à l'affichage. Le serveur revérifie la
 * signature (HMAC avec BETTER_AUTH_SECRET) et l'expiration au moment du clic,
 * dans POST /api/auth/oauth2/consent : un lien falsifié ne peut donc rien
 * autoriser, il échoue au clic.
 *
 * Retourne null si la requête est incomplète ou si `redirect_uri` n'est pas une URL.
 */
export function parseConsentRequest(params: URLSearchParams): ConsentRequest | null {
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  if (!clientId || !redirectUri || !params.get("sig")) return null;
  const redirectHost = hostOf(redirectUri);
  if (!redirectHost) return null;
  return {
    clientId,
    clientHost: hostOf(clientId),
    redirectHost,
    scopes: (params.get("scope") ?? "").split(" ").filter(Boolean),
  };
}
