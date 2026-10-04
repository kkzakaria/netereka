/**
 * Observer UNE version précise du Worker, sur le VRAI domaine.
 *
 * POURQUOI PAS UNE URL DE VERSION. Cloudflare en fabrique une par version
 * (`<préfixe>-netereka.<sous-domaine>.workers.dev`) et elles fonctionnent. Mais
 * elles vivent hors de la zone `netereka.ci`, et `/cdn-cgi/image/` est une
 * fonction DE LA ZONE : mesuré le 2026-10-04, la page d'accueil y perd ses
 * 471 images (404, 17 o, `text/plain`) là où la même URL rend 200 et 9 662 o
 * sur `netereka.ci`. Pour un site dont on veut juger l'APPARENCE — bannières,
 * fiches produit — c'est précisément l'usage qu'une URL de version ne couvre
 * pas. La documentation Cloudflare le dit elle-même : pour éprouver une
 * version AVEC les réglages de la zone, c'est la surcharge, pas l'URL.
 *
 * LA SURCHARGE DE VERSION fait l'inverse : on reste sur `netereka.ci` et on
 * désigne la version par un en-tête. Images, session, Turnstile, règles de
 * zone : tout est celui de la production, puisqu'on n'a pas quitté la
 * production.
 *
 * ---------------------------------------------------------------------------
 * LE PIÈGE, ET LA RAISON D'ÊTRE DE CE MODULE
 * ---------------------------------------------------------------------------
 *
 * Une surcharge qui ne s'applique pas n'échoue pas : elle est IGNORÉE, et la
 * requête repart selon les pourcentages du canari. On reçoit donc un 200
 * parfaitement normal — rendu par une AUTRE version que celle qu'on croit
 * observer. Trois façons d'y tomber :
 *
 *   - la version visée n'est pas dans le déploiement courant ;
 *   - la valeur de l'en-tête n'est pas un dictionnaire RFC 8941 valide
 *     (une faute de frappe dans l'identifiant suffit) ;
 *   - le nom du Worker ne correspond pas.
 *
 * Ce dépôt connaît déjà le coût de ce genre d'erreur : un `.[0]` naïf sur
 * `deployments list` avait routé 90 % du trafic vers une version vieille de
 * deux jours, sans que rien ne le dise. D'où les deux règles tenues ici :
 *
 *   1. on REFUSE de fabriquer un en-tête qu'on ne sait pas valide, au lieu
 *      d'en produire un qui sera silencieusement ignoré ;
 *   2. on VÉRIFIE après coup quelle version a répondu (`/api/version`),
 *      plutôt que de supposer que la surcharge a pris.
 *
 * Module pur : aucune E/S, aucun accès réseau. Les commandes `wrangler` et les
 * requêtes vivent dans `scripts/observer-version.ts`, qui n'est que l'enveloppe
 * de ces fonctions-ci.
 */

/** Nom de l'en-tête, tel que Cloudflare le lit. */
export const EN_TETE_SURCHARGE = "Cloudflare-Workers-Version-Overrides";

/** Chemin de l'endpoint qui dit quelle version a réellement répondu. */
export const CHEMIN_VERSION = "/api/version";

/**
 * Un identifiant de version Cloudflare est un UUID en minuscules. La forme est
 * vérifiée strictement : c'est le seul rempart contre une surcharge ignorée
 * pour cause de faute de frappe, et contre une injection d'en-tête si la
 * référence vient un jour d'ailleurs que du clavier de l'opérateur.
 */
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Noms de Worker acceptés : minuscules, chiffres, tirets.
 *
 * PAS de drapeau `i`. Les clés d'un dictionnaire RFC 8941 sont des `lcalpha` :
 * une majuscule rend l'en-tête entier inanalysable, et Cloudflare ignore alors
 * la surcharge — exactement l'échec silencieux que cette validation existe
 * pour empêcher. Le drapeau `i` était un trou dans son propre garde-fou.
 */
const FORME_NOM_WORKER = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Nombre maximal de versions qu'un déploiement peut servir à la fois.
 * Documenté par Cloudflare, et c'est ce qui rend « déployer à 0 % » impossible
 * tant qu'un canari est en vol : les deux places sont déjà prises.
 */
export const VERSIONS_PAR_DEPLOIEMENT = 2;

/** Un identifiant de version est-il bien formé ? Utilisé aussi par /api/version. */
export function estUuidDeVersion(valeur: unknown): valeur is string {
  return typeof valeur === "string" && FORME_UUID.test(valeur);
}

export interface VersionConnue {
  id: string;
  /** `workers/tag`, que notre CI remplit avec `sha-<court>`. */
  tag?: string;
  creeLe?: string;
  message?: string;
}

export interface PartDeVersion {
  versionId: string;
  pourcentage: number;
}

export type Resolution =
  | { trouve: true; version: VersionConnue }
  | { trouve: false; raison: string };

/**
 * Désigner une version par ce qu'un humain a sous la main : l'UUID complet, son
 * préfixe (ce qu'affichent `wrangler` et nos journaux), ou le sha git.
 *
 * Une référence AMBIGUË est un échec, jamais un premier résultat : « observer
 * une version » n'a de sens que si elle est désignée sans équivoque. Quatre
 * caractères au minimum — en deçà, un préfixe désigne presque toujours
 * plusieurs versions, et accepter la saisie reviendrait à tirer au sort.
 *
 * PORTÉE : `versions` est la liste qu'on lui donne, et
 * `wrangler versions list --json` n'en rend que les DIX plus récentes. « Sans
 * équivoque » vaut donc dans cette fenêtre, pas dans toute l'histoire du
 * Worker. Une version plus ancienne sort en « aucune ne correspond », ce qui
 * est bruyant et donc sans danger ; un préfixe unique dans la fenêtre mais
 * ambigu au-delà passerait — à huit caractères hexadécimaux, on ne l'a jamais
 * vu arriver.
 */
export function resoudreVersion(ref: string, versions: readonly VersionConnue[]): Resolution {
  const voulu = ref.trim().toLowerCase();
  if (voulu.length < 4) {
    return { trouve: false, raison: `« ${ref} » est trop court : quatre caractères au minimum.` };
  }

  const correspond = (v: VersionConnue) => {
    const id = v.id.toLowerCase();
    const tag = v.tag?.toLowerCase();
    return (
      id === voulu ||
      id.startsWith(voulu) ||
      tag === voulu ||
      tag === `sha-${voulu}` ||
      (tag?.startsWith("sha-") === true && tag.slice(4).startsWith(voulu))
    );
  };

  const trouvees = versions.filter(correspond);
  if (trouvees.length === 1) return { trouve: true, version: trouvees[0] };
  if (trouvees.length === 0) {
    return { trouve: false, raison: `aucune version ne correspond à « ${ref} ».` };
  }
  const liste = trouvees.map((v) => `${v.id.slice(0, 8)} (${v.tag ?? "sans étiquette"})`).join(", ");
  return { trouve: false, raison: `« ${ref} » désigne ${trouvees.length} versions : ${liste}.` };
}

/**
 * La valeur de l'en-tête : un dictionnaire RFC 8941, `<worker>="<uuid>"`.
 *
 * LÈVE plutôt que de rendre une valeur douteuse. Rendre une chaîne invalide
 * serait le pire des deux mondes : la requête passerait, et l'opérateur
 * croirait observer une version qu'il n'observe pas.
 */
export function valeurDeSurcharge(nomDuWorker: string, versionId: string): string {
  if (!FORME_NOM_WORKER.test(nomDuWorker)) {
    throw new Error(`Nom de Worker invalide : ${JSON.stringify(nomDuWorker)}.`);
  }
  if (!FORME_UUID.test(versionId)) {
    throw new Error(
      `Identifiant de version invalide : ${JSON.stringify(versionId)}. ` +
        "Un UUID complet est exigé — un préfixe serait accepté par curl et ignoré par Cloudflare.",
    );
  }
  return `${nomDuWorker}="${versionId}"`;
}

/** L'en-tête prêt à poser, sous la forme qu'attendent `fetch` et Browser Run. */
export function enTeteDeSurcharge(nomDuWorker: string, versionId: string): Record<string, string> {
  return { [EN_TETE_SURCHARGE]: valeurDeSurcharge(nomDuWorker, versionId) };
}

export type Applicabilite =
  | { applicable: true; pourcentage: number }
  | { applicable: false; raison: string; placeLibre: boolean };

/**
 * La surcharge ne s'applique QUE si la version est dans le déploiement
 * courant. `placeLibre` dit si l'on peut l'y mettre sans rien déplacer : un
 * canari en vol occupe déjà les deux places, et il faut alors le promouvoir ou
 * le défaire d'abord — ce que CLAUDE.md impose déjà pour une autre raison
 * (une version orpheline, jamais promue).
 */
export function applicabilite(
  versionId: string,
  deploiement: readonly PartDeVersion[],
): Applicabilite {
  // Comparaison insensible à la casse, comme `verifierVersionServie` : les
  // deux côtés viennent de l'API en minuscules, mais deux règles différentes
  // pour la même question finissent toujours par diverger.
  const voulu = versionId.toLowerCase();
  const part = deploiement.find((p) => p.versionId.toLowerCase() === voulu);
  if (part) return { applicable: true, pourcentage: part.pourcentage };
  return {
    applicable: false,
    placeLibre: deploiement.length < VERSIONS_PAR_DEPLOIEMENT,
    raison:
      "cette version n'est pas dans le déploiement courant ; la surcharge serait IGNORÉE " +
      "en silence et la requête servie par le canari.",
  };
}

/**
 * La commande qui met une version dans le déploiement SANS lui donner de
 * trafic : c'est l'inversion de l'ordre habituel — aujourd'hui le canari met
 * la nouvelle version devant 10 % des clients AVANT que quiconque l'ait
 * regardée.
 *
 * Les parts existantes sont conservées telles quelles : on ajoute une place à
 * 0 %, on ne redistribue rien.
 */
export function commandeDeploiementAZero(
  versionId: string,
  deploiement: readonly PartDeVersion[],
): string {
  const parts = [...deploiement.map((p) => `${p.versionId}@${p.pourcentage}%`), `${versionId}@0%`];
  return `npx wrangler versions deploy ${parts.join(" ")} --yes`;
}

export type Verdict =
  | { conforme: true }
  | { conforme: false; message: string };

/**
 * Lire la réponse de `/api/version`.
 *
 * C'est la seule étape qui transforme « j'ai posé un en-tête » en « j'ai
 * observé cette version ». L'endpoint ne rend qu'un booléen — il ne publie
 * pas l'identifiant servi, qui EST le sésame de l'en-tête de surcharge.
 *
 * La troisième branche n'est pas de la paranoïa : si une version ANTÉRIEURE à
 * cette route répond, on n'obtient pas `conforme`, et interpréter l'absence
 * comme « non conforme » serait presque juste pour la mauvaise raison. Le
 * nommer permet de distinguer « la surcharge n'a pas pris » de « ce qui a
 * répondu ne connaît pas ce contrat ».
 */
export function lireVerdict(corps: unknown): Verdict {
  const conforme = (corps as { conforme?: unknown } | null)?.conforme;
  if (conforme === true) return { conforme: true };
  if (conforme === false) {
    return {
      conforme: false,
      message:
        "surcharge NON appliquée : une AUTRE version a répondu. La requête a été " +
        "routée par le canari, et ce que vous observez n'est pas la version demandée.",
    };
  }
  return {
    conforme: false,
    message:
      `${CHEMIN_VERSION} n'a pas rendu de verdict (reçu ${JSON.stringify(corps)}). ` +
      "Ce qui a répondu ne connaît pas ce contrat — probablement une version antérieure à cette route.",
  };
}

export interface OptionsObservation {
  /** La version à observer. Absente = « dis-moi seulement ce qui tourne ». */
  ref?: string;
  chemin: string;
  base: string;
  verifier: boolean;
}

/**
 * Analyse des arguments de `npm run observe`, en UN passage, par position.
 *
 * Écrit ainsi parce que la première version, bâtie sur `indexOf` et `find`,
 * se TAISAIT sur trois saisies fautives (les trois mesurées, les trois
 * couvertes par un test) : `--chemin` sans valeur prenait le drapeau suivant
 * pour sa valeur (`chemin = "--verifier"`) ; une option inconnue était
 * ignorée ; deux références gardaient silencieusement la première. Dans un
 * outil dont la raison d'être est qu'on observe bien LA version demandée, un
 * argument mal lu en silence est le défaut le plus coûteux possible — alors
 * on refuse, et on dit quoi.
 */
export function lireArguments(
  args: readonly string[],
  defauts: { chemin: string; base: string },
): OptionsObservation {
  const options: OptionsObservation = { ...defauts, verifier: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--verifier") {
      options.verifier = true;
    } else if (a === "--chemin" || a === "--base") {
      const valeur = args[++i];
      if (valeur === undefined || valeur.startsWith("--")) {
        throw new Error(`${a} attend une valeur.`);
      }
      if (a === "--chemin") {
        if (!valeur.startsWith("/")) throw new Error("--chemin doit commencer par « / ».");
        options.chemin = valeur;
      } else {
        // `--base /` rendait "" : la requête de vérification levait ensuite sur
        // une URL invalide, loin de la cause. On refuse ici, où l'on sait quoi
        // dire.
        const base = valeur.replace(/\/+$/, "");
        if (!/^https?:\/\/[^/]+$/.test(base)) {
          throw new Error(`--base attend une origine absolue (https://…), reçu « ${valeur} ».`);
        }
        options.base = base;
      }
    } else if (a.startsWith("--")) {
      throw new Error(`Option inconnue : ${a}`);
    } else if (options.ref === undefined) {
      options.ref = a;
    } else {
      throw new Error(`Une seule version à la fois (reçu « ${options.ref} » puis « ${a} »).`);
    }
  }
  return options;
}

export interface DeploiementConnu {
  creeLe: string;
  parts: readonly PartDeVersion[];
}

/**
 * Le déploiement COURANT parmi ceux que rend `wrangler deployments list`.
 *
 * Cette fonction existe séparément pour UNE raison : c'est la logique qui a
 * déjà coûté le plus cher à ce dépôt, et elle était jusqu'ici réécrite à
 * chaque fois dans un script, sans test. `deployments list --json` rend
 * l'ordre CROISSANT (le plus ancien d'abord) ; un `[0]` naïf avait routé 90 %
 * du trafic vers une version vieille de deux jours.
 *
 * Une date illisible fait LEVER au lieu de se glisser dans le tri :
 * `Date.parse("")` rend NaN, toute comparaison avec NaN est fausse, et le tri
 * rendrait alors l'ordre d'origine — croissant — c'est-à-dire le piège
 * lui-même, en silence.
 */
export function deploiementCourant(
  deploiements: readonly DeploiementConnu[],
): readonly PartDeVersion[] {
  if (deploiements.length === 0) throw new Error("Aucun déploiement listé.");
  const dates = deploiements.map((d) => {
    const t = Date.parse(d.creeLe);
    if (Number.isNaN(t)) {
      throw new Error(`Déploiement sans date lisible : ${JSON.stringify(d.creeLe)}.`);
    }
    return { d, t };
  });
  return [...dates].sort((a, b) => b.t - a.t)[0].d.parts;
}
