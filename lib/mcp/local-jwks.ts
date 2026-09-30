/**
 * Sert le JWKS de better-auth depuis le Worker lui-même, sans requête réseau.
 *
 * Pourquoi : `requireMcpAuth` récupère les clés de vérification en faisant un
 * `fetch(`${baseURL}/jwks`)`, c'est-à-dire que le Worker appelle sa propre URL
 * publique. En production cette sous-requête échoue à chaque appel (statut
 * d'erreur sans corps JSON : "Jwks failed: " sans détail), alors que la même URL
 * répond 200 depuis l'extérieur. Le Worker détient déjà les clés : on les lui
 * fait lire directement plutôt que de faire un aller-retour Internet.
 *
 * Comment : l'API de @better-auth/mcp n'accepte qu'un `jwksUrl` (chaîne), pas
 * de fonction. Plutôt que de réécrire la vérification (signature, émetteur,
 * audience, expiration, DPoP, challenge WWW-Authenticate), on laisse la
 * bibliothèque faire tout son travail et on répond nous-mêmes, en mémoire, à
 * cette unique URL exacte. La bibliothèque conserve son cache (5 min) et son
 * rechargement sur `kid` inconnu ; toute autre requête traverse inchangée.
 */

type KeySource = () => Promise<unknown>;

const SOURCES = new Map<string, KeySource>();
const INSTALLED = Symbol.for("netereka.localJwksFetch");

type FetchFn = typeof fetch;
type PatchedGlobal = typeof globalThis & { [INSTALLED]?: boolean };

function requestUrl(input: Parameters<FetchFn>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestMethod(input: Parameters<FetchFn>[0], init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
}

/**
 * Déclare `jwksUrl` comme servie en mémoire par `getKeys`, et installe (une
 * seule fois par isolat) l'enveloppe de `fetch` qui l'intercepte. Idempotent :
 * rappeler avec la même URL remplace simplement la source.
 */
export function serveJwksLocally(jwksUrl: string, getKeys: KeySource): void {
  SOURCES.set(new URL(jwksUrl).href, getKeys);

  const g = globalThis as PatchedGlobal;
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;

  const passthrough: FetchFn = g.fetch.bind(globalThis);
  g.fetch = (async (input, init) => {
    let source: KeySource | undefined;
    if (requestMethod(input, init) === "GET") {
      try {
        source = SOURCES.get(new URL(requestUrl(input)).href);
      } catch {
        // URL relative ou invalide : pas la nôtre, on laisse fetch trancher.
      }
    }
    if (!source) return passthrough(input, init);
    try {
      return Response.json(await source());
    } catch (err) {
      console.error("[mcp] lecture locale du JWKS échouée", err);
      return new Response("JWKS indisponible", { status: 500 });
    }
  }) as FetchFn;
}
