import { isPublicRoutableHost } from "@better-auth/core/utils/host";

/**
 * Transport « propriétaire » des Client ID Metadata Documents (CIMD).
 *
 * `@better-auth/cimd/node` ne peut pas servir ici : il repose sur
 * `node:https.request` avec un `lookup` épinglé, et le runtime Workers de ce
 * projet répond `[unenv] https.request is not implemented yet!` (vérifié sous
 * workerd, compatibility_date 2024-12-01). La doc de better-auth prévoit ce cas
 * : le transport appartient à l'application.
 *
 * Ce que ce transport garantit : schéma HTTPS, port 443, pas d'identifiants dans
 * l'URL, hôte public (les littéraux IP privés, loopback, link-local et les noms
 * de métadonnées cloud sont refusés), GET uniquement, redirections jamais suivies.
 *
 * Ce qu'il NE garantit PAS : l'épinglage DNS (résoudre une fois, se connecter à
 * l'adresse validée). Workers n'expose pas cette primitive ; un nom qui résout
 * vers une adresse privée est laissé au pare-feu d'egress de la plateforme
 * (un Worker n'atteint pas les plages privées ni le loopback).
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

  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET") throw new TypeError("CIMD : seul GET est autorisé");

  // Redirection jamais suivie : une 3xx est renvoyée telle quelle, l'appelant la
  // traite comme un échec (statut différent de 200).
  return fetch(url, { headers: init?.headers, signal: init?.signal, method: "GET", redirect: "manual" });
}
