/**
 * Le fournisseur OAuth (better-auth 1.7, @better-auth/oauth-provider) envoie un
 * appelant non authentifié de /oauth2/authorize vers `/admin/login?<requête OAuth
 * signée>` : la requête d'origine plus `exp`, `ba_iat` et `sig` (HMAC). La reprise
 * du flux n'est plus une navigation vers l'endpoint d'autorisation : on renvoie
 * cette chaîne telle quelle dans le champ `oauth_query` du corps de la connexion,
 * le serveur vérifie la signature puis répond `{ redirect: true, url }` vers la
 * page de consentement (ou directement vers le client s'il a déjà été autorisé).
 *
 * Retourne null si la requête n'est pas une requête OAuth signée : le
 * formulaire se comporte alors comme une connexion administrateur ordinaire.
 */
const REQUIRED_PARAMS = ["client_id", "redirect_uri", "response_type", "exp", "sig"] as const;

export function getOAuthQuery(params: URLSearchParams): string | null {
  for (const key of REQUIRED_PARAMS) {
    if (!params.get(key)) return null;
  }
  return params.toString();
}
