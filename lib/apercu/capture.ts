/**
 * Photographier une page d'aperçu par Browser Run.
 *
 * POURQUOI LA LIAISON ET PAS L'API REST. La liaison `env.BROWSER` parle à
 * Browser Run par le réseau interne de Cloudflare : pas de jeton d'API à
 * poser, à faire tourner, ni à oublier dans un environnement sur deux. Son
 * prix est une date de compatibilité à 2026-03-24 au minimum, payée
 * séparément (#408) et observée avant d'être promue.
 *
 * CE QUE JE NE SUPPOSE PAS. `@cloudflare/workers-types` ne publie pas encore
 * d'interface pour `quickAction()`, et la documentation ne dit pas ce que
 * l'appel REND sous la liaison — son exemple renvoie le résultat directement
 * depuis un `fetch`, ce qui SUGGÈRE une `Response` sans l'affirmer. Plutôt que
 * d'écrire une assertion de type qui serait un vœu, `octetsDeLaCapture`
 * accepte les trois formes plausibles et LÈVE en décrivant ce qu'elle a reçu
 * si c'en est une quatrième. Un plantage qui nomme la forme réelle vaut mieux
 * qu'un `undefined` qui voyage.
 */

/** Ce qu'on attend de la liaison, déclaré au plus près de l'unique appel. */
export interface LiaisonNavigateur {
  quickAction(action: "screenshot", options: OptionsCapture): Promise<unknown>;
}

/**
 * Le sélecteur attendu, tel que Browser Run l'accepte : un OBJET.
 *
 * MESURÉ, APRÈS S'ÊTRE TROMPÉ. La première version passait ici une simple
 * chaîne, et le service a répondu **400** sur chaque appel — l'outil n'a
 * jamais rendu une seule image. La documentation du point d'entrée nomme bien
 * `waitForSelector` parmi les paramètres de premier niveau, mais sans en
 * donner la forme ; le seul exemple littéral de Cloudflare la donne, dans le
 * guide de pré-rendu :
 *
 *     waitForSelector: { selector: "[data-prerender-ready='true']", timeout: 30000 }
 *
 * et le tableau des délais le corrobore en rangeant `waitForSelector` parmi
 * les MINUTEURS (défaut `null`, plafond 60 s) — un minuteur n'a de sens que
 * si le champ porte son propre `timeout`.
 *
 * Les tests, eux, exigeaient la chaîne : ils encodaient l'erreur et sont
 * restés verts tout du long. Aucun test local ne pouvait trancher cela, seul
 * un appel réel au service. D'où le corps de la réponse désormais rapporté
 * par `octetsDeLaCapture` : la prochaine forme refusée se nommera elle-même.
 */
export interface SelecteurAttendu {
  selector: string;
  timeout?: number;
}

export interface OptionsCapture {
  url: string;
  viewport: { width: number; height: number; deviceScaleFactor?: number };
  screenshotOptions?: { fullPage?: boolean; type?: "png" | "jpeg"; quality?: number };
  gotoOptions?: { waitUntil?: "load" | "networkidle0" | "networkidle2"; timeout?: number };
  /**
   * Sélecteur CSS dont l'absence FAIT ÉCHOUER la capture.
   *
   * C'est la seule chose qui distingue « j'ai photographié l'aperçu » de
   * « j'ai photographié une page ». Si le laissez-passer est refusé, la page
   * redirige vers la connexion et Browser Run suit la redirection : il rend
   * alors le JPEG de la page de connexion. Le contrôle de taille ne voit rien
   * — l'image est bien formée, non vide, crédible, et fausse.
   *
   * Que Browser Run SUIVE la redirection est le comportement attendu d'une
   * navigation de navigateur ; je ne l'ai pas mesuré, et le marqueur rend la
   * question sans objet : toute page qui n'est pas l'aperçu demandé fait
   * échouer l'appel.
   *
   * La documentation de Cloudflare range le dépassement du délai d'attente
   * d'ÉLÉMENT parmi les causes de 422 : un sélecteur qui n'apparaît jamais
   * fait donc échouer l'appel au lieu de rendre une image. Fail-closed.
   */
  waitForSelector?: SelecteurAttendu;
  cookies?: readonly CookieDeCapture[];
}

/**
 * Un cookie posé par Browser Run avant la navigation.
 *
 * `path` est ce qui empêche le laissez-passer de partir avec les images et les
 * actifs de la page — et jamais vers un autre domaine. C'est la raison d'être
 * du cookie plutôt que d'un en-tête ; voir `lib/apercu/jeton-capture.ts`.
 */
export interface CookieDeCapture {
  name: string;
  value: string;
  domain: string;
  path: string;
  /**
   * `httpOnly` n'est pas décoratif ici : la page d'aperçu REND du HTML
   * d'auteur, composé par le modèle, et l'assainissement est la seule chose
   * entre ce HTML et l'exécution d'un script. Un oubli d'assainissement
   * donnerait `document.cookie`, donc le laissez-passer vivant — et refermer
   * la fuite vers les tiers par un cookie pour la ré-ouvrir vers le contenu
   * prévisualisé n'aurait aucun sens.
   */
  httpOnly?: boolean;
  secure?: boolean;
}

/** Les deux écrans sur lesquels une bannière se joue vraiment. */
export const ECRANS = {
  mobile: { width: 390, height: 844 },
  bureau: { width: 1440, height: 900 },
} as const;

export type NomDEcran = keyof typeof ECRANS;

/**
 * JPEG, pas PNG. Une capture de bureau en PNG pèse facilement plus d'un Mo,
 * et le base64 d'un bloc image MCP ajoute un tiers. En JPEG à 85 on juge
 * parfaitement une mise en page, un contraste et un recadrage — ce pour quoi
 * ces images existent — pour quelques dizaines de kilo-octets.
 */
const QUALITE_JPEG = 85;

/**
 * Délai d'attente du marqueur, en millisecondes.
 *
 * Il s'ajoute à celui de la navigation (30 s) et non s'y substitue, d'où une
 * valeur franchement plus courte : le marqueur est rendu par le serveur, il
 * est donc dans le HTML initial — s'il n'est pas là au bout de quinze
 * secondes, il n'y sera jamais, et attendre la minute entière ne ferait que
 * retarder un échec. Le plafond du service est 60 s.
 *
 * CE QUE CE DÉLAI NE DIRA PAS. Un 422 « délai d'élément dépassé » recouvre
 * trois causes qu'il ne distingue pas : un laissez-passer refusé (la page
 * redirige, le marqueur n'apparaît jamais), un marqueur disparu
 * d'`ApercuEntete`, ou un identifiant qui ne correspond pas. La vraie raison
 * EXISTE — `autoriserApercu` journalise `[apercu] laissez-passer refusé
 * (<raison>)` — mais elle est émise dans une AUTRE requête du Worker, celle
 * qui rend la page, donc elle ne peut structurellement pas remonter dans la
 * réponse MCP. Devant un 422, c'est dans les journaux du Worker qu'il faut
 * aller chercher cette ligne.
 */
const DELAI_SELECTEUR_MS = 15_000;

/**
 * Plafond par image, en octets DÉCODÉS.
 *
 * Aligné sur `view_image` (3,5 Mio) et pour la même raison : le bloc image
 * voyage en base64, soit 4/3 de la taille. Mais ici on en rend DEUX, d'où le
 * plafond par image plutôt que global — un refus doit dire quelle capture est
 * trop lourde, pas « le lot est trop lourd ».
 */
export const CAPTURE_MAX_OCTETS = 1.5 * 1024 * 1024;

export class EchecDeCapture extends Error {}

/** Longueur au-delà de laquelle le motif du refus est tronqué. */
const MOTIF_MAX = 400;

/**
 * Le motif d'un refus, en une ligne lisible — ou rien.
 *
 * POURQUOI LIRE LE CORPS. Un « Browser Run a répondu 400. » nu a coûté une
 * enquête entière : le service refusait la FORME de `waitForSelector` et le
 * disait, dans un corps que ce code jetait.
 *
 * POURQUOI PAS UN CORPS HTML. Un corps HTML n'est pas un motif, c'est une
 * page — le cas que `CLAUDE.md` nomme explicitement est la page de défi
 * anti-robot que Browser Run photographierait si Bot Fight Mode était activé
 * sur la zone. Ses quatre cents premiers caractères sont un `<!DOCTYPE>`, un
 * `<title>` et des `<meta>` : zéro information, et le peu d'utile coupé. On
 * NOMME donc la page au lieu de la déverser — « une page HTML » est un
 * signal, quatre cents caractères de balisage sont du bruit.
 *
 * Le repliement des blancs se fait AVANT la troncature, pour que les quatre
 * cents caractères retenus en soient quatre cents d'utiles.
 */
async function motifDuRefus(reponse: Response): Promise<string> {
  const type = reponse.headers.get("content-type") ?? "";
  if (/\b(?:ht|x)ml\b/i.test(type)) {
    return "le corps est une page HTML, pas un motif (page de défi anti-robot ?)";
  }
  // Un corps illisible (déjà consommé, flux coupé) ne doit pas remplacer le
  // code d'état par une erreur de lecture : on perdrait la seule information
  // dont on était sûr.
  let motif: string;
  try {
    motif = (await reponse.text()).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
  return motif.length > MOTIF_MAX ? `${motif.slice(0, MOTIF_MAX)}…` : motif;
}

/**
 * Ramener les octets, quelle que soit la forme rendue par la liaison.
 *
 * Trois formes acceptées : une `Response` (ce que la documentation suggère —
 * et ce que le premier appel réel a confirmé, par son 400), un `ArrayBuffer`,
 * ou une vue d'octets. Tout le reste lève en décrivant ce qu'on a reçu.
 */
export async function octetsDeLaCapture(resultat: unknown): Promise<Uint8Array> {
  if (resultat instanceof Response) {
    if (!resultat.ok) {
      const motif = await motifDuRefus(resultat);
      throw new EchecDeCapture(
        motif
          ? `Browser Run a répondu ${resultat.status} : ${motif}`
          : `Browser Run a répondu ${resultat.status}.`,
      );
    }
    return new Uint8Array(await resultat.arrayBuffer());
  }
  if (resultat instanceof ArrayBuffer) return new Uint8Array(resultat);
  if (resultat instanceof Uint8Array) return resultat;
  if (ArrayBuffer.isView(resultat)) {
    const vue = resultat as ArrayBufferView;
    return new Uint8Array(vue.buffer, vue.byteOffset, vue.byteLength);
  }

  const forme =
    resultat === null || resultat === undefined
      ? String(resultat)
      : `${typeof resultat}${resultat.constructor?.name ? ` (${resultat.constructor.name})` : ""}`;
  throw new EchecDeCapture(
    `Forme inattendue rendue par env.BROWSER.quickAction : ${forme}. ` +
      "Le code accepte Response, ArrayBuffer et une vue d'octets ; adaptez-le plutôt " +
      "que de laisser passer une valeur qu'on ne sait pas lire.",
  );
}

export interface Capture {
  ecran: NomDEcran;
  largeur: number;
  hauteur: number;
  octets: Uint8Array;
}

/**
 * Retirer du message TOUTE valeur de laissez-passer, avant qu'il ne remonte.
 *
 * C'EST UN INVARIANT DU DÉPÔT, PAS UNE PRÉCAUTION NEUVE. `jeton-capture.ts`
 * a REFUSÉ de mettre le laissez-passer dans l'URL parce qu'« une URL se
 * retrouve dans les journaux, les en-têtes Referer et l'historique du
 * capteur » ; un corps d'erreur rendu au client MCP est la même classe de
 * fuite, et le modèle conserve ce qu'on lui rend. Rapporter le corps du refus
 * sans caviarder aurait relâché cet invariant au moment même où on le citait.
 *
 * Que Browser Run recopie la valeur reçue dans un refus de validation n'est
 * PAS mesuré — les enveloppes d'erreur de l'API Cloudflare le font souvent,
 * et c'est un comportement du service, qui peut changer sans nous. Le coût de
 * la fermeture est nul ; celui d'un jeton encore valide une cinquantaine de
 * secondes, rendu au client et journalisé chez lui, ne l'est pas.
 *
 * On ne caviarde QUE `EchecDeCapture`, la seule classe dont le message est
 * rendu au client : tout le reste part dans les journaux du Worker, qui sont
 * les nôtres.
 */
function caviarder(e: unknown, biscuits: readonly CookieDeCapture[]): unknown {
  if (!(e instanceof EchecDeCapture)) return e;
  let message = e.message;
  for (const biscuit of biscuits) {
    if (biscuit.value) message = message.replaceAll(biscuit.value, "«laissez-passer caviardé»");
  }
  return message === e.message ? e : new EchecDeCapture(message);
}

/**
 * Une capture, sur un écran.
 *
 * `networkidle0` et non `load` : la vitrine charge ses images par
 * `next/image`, donc après le `load` de la page. Avec `load`, la photo sort
 * avant les images — c'est-à-dire exactement sans ce qu'on veut regarder.
 */
export async function capturer(
  navigateur: LiaisonNavigateur,
  url: string,
  ecran: NomDEcran,
  biscuits: readonly CookieDeCapture[],
  pleinePage: boolean,
  selecteurExige: string,
): Promise<Capture> {
  const { width, height } = ECRANS[ecran];

  // Le laissez-passer est DANS la charge envoyée : tout message d'échec né de
  // cet appel peut le recopier. D'où le caviardage, posé à la frontière la
  // plus étroite qui connaisse à la fois les biscuits et l'erreur.
  let octets: Uint8Array;
  try {
    const resultat = await navigateur.quickAction("screenshot", {
      url,
      viewport: { width, height, deviceScaleFactor: 1 },
      screenshotOptions: { fullPage: pleinePage, type: "jpeg", quality: QUALITE_JPEG },
      gotoOptions: { waitUntil: "networkidle0", timeout: 30_000 },
      waitForSelector: { selector: selecteurExige, timeout: DELAI_SELECTEUR_MS },
      cookies: biscuits,
    });
    octets = await octetsDeLaCapture(resultat);
  } catch (e) {
    throw caviarder(e, biscuits);
  }
  if (octets.byteLength === 0) {
    throw new EchecDeCapture("Browser Run a rendu une image vide.");
  }
  if (octets.byteLength > CAPTURE_MAX_OCTETS) {
    throw new EchecDeCapture(
      `Capture ${ecran} trop lourde : ${(octets.byteLength / 1024 / 1024).toFixed(1)} Mio, ` +
        `plafond ${(CAPTURE_MAX_OCTETS / 1024 / 1024).toFixed(1)} Mio. ` +
        (pleinePage
          ? "Réessayez avec pleine_page à false."
          : "La page est anormalement lourde : regardez-la à la main."),
    );
  }
  return { ecran, largeur: width, hauteur: height, octets };
}
