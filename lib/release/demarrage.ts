/**
 * Le Worker CONSTRUIT démarre-t-il, et sert-il des pages ?
 *
 * POURQUOI CE MODULE EXISTE. Le 2026-11-22, le canari `eada7b4` (Next 16.4.6
 * avec OpenNext 1.20.7) est passé par toute la chaîne au vert : types, lint,
 * 2452 tests, `build:worker`, téléversement. Puis il a répondu 500 / erreur
 * 1101 sur TOUTES les routes, `/api/version` comprise — 10 % des visiteurs
 * avaient un site entièrement hors service, jusqu'au retour arrière.
 * L'erreur (`Unexpected loadManifest(/.next/server/preview-props.json)
 * call!`) se produisait dans le code d'OpenNext, avant le moindre code de
 * l'application : aucun test unitaire ne pouvait la voir, puisqu'aucun ne
 * fait tourner le Worker construit. Le peer d'OpenNext 1.20.7
 * (`next >=16.3.6`) n'a pas de borne haute, donc npm n'a rien dit non plus.
 *
 * Ce qui l'aurait arrêté tient en une phrase : construire le Worker, le
 * lancer, et lui demander une page. C'est ce que fait
 * `scripts/verifier-demarrage.ts`, sur chaque PR. Ce fichier n'en garde que
 * la partie pure — quelles routes, quelle réponse est saine — pour qu'elle
 * soit testée sans Worker ni réseau.
 *
 * CE QUE CHAQUE SONDE PROUVE, ET POURQUOI CELLE-LÀ.
 *
 *   - `/api/version` : la route la plus simple du Worker. Si ELLE échoue,
 *     rien de l'application n'a tourné — c'est la signature exacte de
 *     l'incident. On exige un JSON portant un booléen `conforme`, pas un
 *     simple 200 : un 200 rendu par autre chose que notre route ne prouverait
 *     rien.
 *   - `/`, `/auth/sign-in`, `/admin/login` : le rendu React côté serveur, la
 *     vitrine avec ses lectures D1 (sur une base migrée mais vide), les deux
 *     pages d'authentification.
 *   - La découverte OAuth et `/auth/sign-in` : better-auth 1.7 contrôle le
 *     schéma de la base au premier appel qui l'atteint, et une colonne
 *     manquante fait répondre 500 `SCHEMA_MISMATCH` (CLAUDE.md, « DB
 *     tables »). Ces deux sondes tombent alors — MESURÉ le 2026-11-22 en
 *     retirant `session.impersonatedBy` (migration 0020) de la base jetable :
 *     500 sur l'une et l'autre. Le schéma des migrations est donc éprouvé
 *     contre celui qu'attend better-auth.
 *   - `POST /api/mcp` sans jeton → 401 : la route, `initAuth()` et la
 *     vérification du jeton se montent. Elle NE prouve PAS le schéma : dans
 *     la même mesure, elle répondait encore 401, la vérification de schéma
 *     n'ayant lieu qu'au premier accès à la base.
 *
 * CE QU'ELLE NE PROUVE PAS. Le Worker tourne sous `wrangler dev --local` :
 * même `workerd`, même bundle, même date de compatibilité que la production,
 * mais sans la zone (`/cdn-cgi/image/`), sans les liaisons distantes
 * (`BROWSER`), avec une base vide et des secrets factices. Un défaut qui ne
 * se montre qu'avec les vraies données ou les vrais secrets passe encore —
 * c'est le rôle du canari et de `npm run observe`.
 */

export type Methode = "GET" | "POST";

export interface Sonde {
  /** Ce que la sonde vérifie, en clair, pour le rapport. */
  nom: string;
  methode: Methode;
  chemin: string;
  corps?: string;
  statutAttendu: number;
  /** Contrôle du corps, en plus du statut. Renvoie un motif d'échec, ou `null`. */
  controlerCorps?: (corps: string) => string | null;
}

export interface Reponse {
  statut: number;
  corps: string;
}

export interface Verdict {
  sonde: Sonde;
  ok: boolean;
  /** Absent quand `ok`. */
  motif?: string;
  statut?: number;
}

/**
 * Un UUID de version bien formé mais qui n'est celui d'aucune version :
 * `/api/version` refuse un paramètre `attendu` mal formé (400) avant de lire
 * quoi que ce soit, et c'est la lecture qu'on veut voir réussir.
 */
export const UUID_FICTIF = "00000000-0000-4000-8000-000000000000";

function jsonAvec(champ: string, type: "boolean" | "string") {
  return (corps: string): string | null => {
    let valeur: unknown;
    try {
      valeur = JSON.parse(corps);
    } catch {
      return `le corps n'est pas du JSON : ${apercu(corps)}`;
    }
    if (typeof valeur !== "object" || valeur === null || typeof (valeur as Record<string, unknown>)[champ] !== type) {
      return `JSON sans champ \`${champ}\` de type ${type} : ${apercu(corps)}`;
    }
    return null;
  };
}

function pageHtml(corps: string): string | null {
  return /<html[\s>]/i.test(corps) ? null : `pas une page HTML : ${apercu(corps)}`;
}

export const SONDES: readonly Sonde[] = [
  {
    nom: "le Worker exécute le code de l'application",
    methode: "GET",
    chemin: `/api/version?attendu=${UUID_FICTIF}`,
    statutAttendu: 200,
    controlerCorps: jsonAvec("conforme", "boolean"),
  },
  { nom: "la vitrine se rend (accueil)", methode: "GET", chemin: "/", statutAttendu: 200, controlerCorps: pageHtml },
  { nom: "page de connexion client", methode: "GET", chemin: "/auth/sign-in", statutAttendu: 200, controlerCorps: pageHtml },
  { nom: "page de connexion admin", methode: "GET", chemin: "/admin/login", statutAttendu: 200, controlerCorps: pageHtml },
  {
    nom: "la route MCP se monte et refuse sans jeton",
    methode: "POST",
    chemin: "/api/mcp",
    corps: "{}",
    statutAttendu: 401,
  },
  {
    nom: "découverte OAuth : better-auth accepte le schéma de la base",
    methode: "GET",
    chemin: "/.well-known/oauth-authorization-server/api/auth",
    statutAttendu: 200,
    controlerCorps: jsonAvec("issuer", "string"),
  },
];

/** Les 200 premiers caractères, espaces resserrés : de quoi reconnaître une page d'erreur. */
export function apercu(corps: string): string {
  const resserre = corps.replace(/\s+/g, " ").trim();
  return resserre.length > 200 ? `${resserre.slice(0, 200)}…` : resserre || "(vide)";
}

export function juger(sonde: Sonde, reponse: Reponse): Verdict {
  if (reponse.statut !== sonde.statutAttendu) {
    return {
      sonde,
      ok: false,
      statut: reponse.statut,
      motif: `statut ${reponse.statut} au lieu de ${sonde.statutAttendu} : ${apercu(reponse.corps)}`,
    };
  }
  const motif = sonde.controlerCorps?.(reponse.corps) ?? null;
  return motif ? { sonde, ok: false, statut: reponse.statut, motif } : { sonde, ok: true, statut: reponse.statut };
}

/** Une sonde qui n'a pas obtenu de réponse du tout (connexion refusée, délai). */
export function sansReponse(sonde: Sonde, erreur: unknown): Verdict {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  return { sonde, ok: false, motif: `aucune réponse : ${message}` };
}

export function rapport(verdicts: readonly Verdict[]): { ok: boolean; lignes: string[] } {
  const lignes = verdicts.map((v) =>
    v.ok
      ? `  ✓ ${v.sonde.methode} ${v.sonde.chemin} → ${v.statut}  (${v.sonde.nom})`
      : `  ✗ ${v.sonde.methode} ${v.sonde.chemin}  (${v.sonde.nom})\n      ${v.motif}`,
  );
  return { ok: verdicts.length > 0 && verdicts.every((v) => v.ok), lignes };
}
