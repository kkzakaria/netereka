import { isPublicRoutableHost } from "@better-auth/core/utils/host";

/**
 * Transport « propriétaire » des Client ID Metadata Documents (CIMD).
 *
 * `@better-auth/cimd/node` ne peut pas servir ici : il repose sur
 * `node:https.request` avec un `lookup` épinglé, et le runtime Workers de ce
 * projet répond `[unenv] https.request is not implemented yet!` (vérifié sous
 * workerd, compatibility_date 2024-12-01). La doc de better-auth prévoit ce cas :
 * le transport appartient à l'application.
 *
 * Pourquoi il n'y a pas d'épinglage DNS : le transport `/node` en a besoin parce
 * qu'il résout le nom lui-même, puis se connecte (deux résolutions, donc une
 * fenêtre de rebinding entre le contrôle et la connexion). Ici il n'y a aucune
 * résolution en processus : `fetch` de Workers résout et se connecte en une
 * seule opération, il n'existe donc pas de fenêtre à épingler. Ce qui n'est pas
 * disponible, c'est la validation de l'adresse *résolue* (Workers ne l'expose
 * pas). Ses substituts : le pare-feu d'egress de la plateforme (un Worker
 * n'atteint pas les plages privées ni le loopback) et le filtre d'URL
 * `isMetadataDocumentUrlAllowed` (voir cimd-policy.ts).
 *
 * Garanties de ce transport : HTTPS, GET seul, pas d'identifiants dans l'URL,
 * hôte publiquement routable (littéraux IP privés, loopback, link-local, noms de
 * métadonnées cloud refusés), aucune redirection suivie, et **port 443 seul** :
 * durcissement délibéré, la bibliothèque (validateClientIdUrl) ne contraint pas
 * le port ; sans lui, /oauth2/authorize (joignable sans authentification)
 * servirait de balayeur de ports.
 */
export async function fetchClientMetadataResource(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input);

  if (url.protocol !== "https:") throw new TypeError("CIMD : HTTPS obligatoire");
  if (url.port && url.port !== "443") throw new TypeError("CIMD : seul le port 443 est autorisé");
  if (url.username || url.password) throw new TypeError("CIMD : identifiants interdits dans l'URL");
  if (!isPublicRoutableHost(url.hostname)) {
    throw new TypeError("CIMD : l'hôte doit être publiquement routable");
  }

  // La bibliothèque demande redirect: "error". On n'en dépend pas pour la sécurité
  // (on force "manual" plus bas), mais un changement amont vers "follow" doit
  // casser bruyamment plutôt que régresser en silence.
  if (init?.redirect !== undefined && init.redirect !== "error") {
    throw new TypeError(`CIMD : redirect "${init.redirect}" inattendu (attendu "error")`);
  }

  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET") throw new TypeError("CIMD : seul GET est autorisé");

  // Redirection jamais suivie : une 3xx est renvoyée telle quelle, l'appelant la
  // traite comme un échec (statut différent de 200).
  return fetch(url, { headers: init?.headers, signal: init?.signal, method: "GET", redirect: "manual" });
}
