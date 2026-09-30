import type { GenericEndpointContext } from "@better-auth/core";

/**
 * Origines de clients MCP attendues (ex. "https://claude.ai"). Vide = toute
 * origine publique est acceptée (état actuel : la liste des clients réels reste à
 * établir). Une liste non vide réduit à rien l'oracle d'atteignabilité décrit
 * dans isCimdUrlAllowed.
 */
export const CIMD_ALLOWED_ORIGINS: readonly string[] = [
  // Vérifié le 2026-09-30 : https://claude.ai/oauth/mcp-oauth-client-metadata et
  // .../claude-code-client-metadata répondent 200 application/json, avec un
  // `client_id` auto-référentiel comme CIMD l'exige. Couvre claude.ai, Claude
  // Desktop et Claude Code.
  "https://claude.ai",
  // Codex et ChatGPT desktop publient sous
  // https://chatgpt.com/oauth/codex/<callback_id>/client.json — le chemin varie
  // par installation, donc seule l'origine est vérifiable ici, et elle ne l'a
  // pas été par une récupération réelle. À confirmer à la première connexion.
  "https://chatgpt.com",
  // Cursor N'EST PAS dans cette liste, et ce n'est pas un oubli : il
  // s'enregistre par DCR, que le régime CIMD seul n'expose pas. L'ajouter ici
  // ne le ferait pas fonctionner — c'est la décision « CIMD seul » qui
  // l'exclut, pas cette liste.
];

/**
 * Filtre `isMetadataDocumentUrlAllowed` de cimd() : décide, AVANT toute requête
 * sortante, si un `client_id` (URL) peut être récupéré.
 *
 * Pourquoi : /oauth2/authorize résout le client avant tout contrôle de session,
 * et ses erreurs distinguent statut HTTP, type de contenu, JSON invalide et
 * délai. Sans filtre, c'est un oracle SSRF aveugle, sans authentification, sur le
 * port 443 de n'importe quel hôte public.
 *
 * 1. Refuse notre propre origine : `client_id` accepte une chaîne de requête, il
 *    pourrait pointer vers notre propre /oauth2/authorize (récursion).
 * 2. Si `allowedOrigins` n'est pas vide, n'accepte que ces origines.
 */
export function isCimdUrlAllowed(
  clientIdUrl: string,
  siteUrl: string,
  allowedOrigins: readonly string[] = CIMD_ALLOWED_ORIGINS,
): boolean {
  let origin: string;
  let siteOrigin: string;
  try {
    origin = new URL(clientIdUrl).origin;
    siteOrigin = new URL(siteUrl).origin;
  } catch {
    return false;
  }
  if (origin === siteOrigin) return false;
  if (allowedOrigins.length > 0) return allowedOrigins.includes(origin);
  return true;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && new Set(a).size === new Set(b).size && a.every((x) => b.includes(x));
}

/** Vrai si la liste des redirect_uris d'un client a changé (ordre ignoré). */
export function redirectUrisChanged(previous: readonly string[] | undefined, next: readonly string[] | undefined): boolean {
  return !sameSet(previous ?? [], next ?? []);
}

/**
 * `onClientRefreshed` de cimd() : un rafraîchissement remplace `redirectUris` depuis
 * le document, sans invalider le consentement stocké, et `redirect_uris` n'est PAS
 * lié à l'origine du client_id. Sans ceci, quelqu'un qui obtient l'écriture du
 * document d'un client déjà approuvé pourrait rediriger les codes vers un autre
 * hôte sans écran de consentement. On supprime donc le consentement du client
 * quand ses redirect_uris changent : la prochaine autorisation repasse par l'écran.
 *
 * Limite : la bibliothèque traite ce rappel en « meilleur effort » (une erreur
 * est journalisée, pas propagée) ; on journalise en `error` pour l'observabilité.
 */
export async function revokeConsentOnRedirectChange(event: {
  client: { clientId: string; redirectUris?: string[] };
  previousClient: { redirectUris?: string[] };
  context: GenericEndpointContext;
}): Promise<void> {
  if (!redirectUrisChanged(event.previousClient.redirectUris, event.client.redirectUris)) return;
  try {
    await event.context.context.adapter.deleteMany({
      model: "oauthConsent",
      where: [{ field: "clientId", value: event.client.clientId }],
    });
  } catch (err) {
    event.context.context.logger.error("[cimd] échec de la révocation du consentement", err);
    throw err;
  }
}
