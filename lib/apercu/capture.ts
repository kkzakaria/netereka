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

export interface OptionsCapture {
  url: string;
  viewport: { width: number; height: number; deviceScaleFactor?: number };
  screenshotOptions?: { fullPage?: boolean; type?: "png" | "jpeg"; quality?: number };
  gotoOptions?: { waitUntil?: "load" | "networkidle0" | "networkidle2"; timeout?: number };
  setExtraHTTPHeaders?: Record<string, string>;
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
 * Plafond par image, en octets DÉCODÉS.
 *
 * Aligné sur `view_image` (3,5 Mio) et pour la même raison : le bloc image
 * voyage en base64, soit 4/3 de la taille. Mais ici on en rend DEUX, d'où le
 * plafond par image plutôt que global — un refus doit dire quelle capture est
 * trop lourde, pas « le lot est trop lourd ».
 */
export const CAPTURE_MAX_OCTETS = 1.5 * 1024 * 1024;

export class EchecDeCapture extends Error {}

/**
 * Ramener les octets, quelle que soit la forme rendue par la liaison.
 *
 * Trois formes acceptées : une `Response` (ce que la documentation suggère),
 * un `ArrayBuffer`, ou une vue d'octets. Tout le reste lève en décrivant ce
 * qu'on a reçu.
 */
export async function octetsDeLaCapture(resultat: unknown): Promise<Uint8Array> {
  if (resultat instanceof Response) {
    if (!resultat.ok) {
      throw new EchecDeCapture(`Browser Run a répondu ${resultat.status}.`);
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
  enTetes: Record<string, string>,
  pleinePage: boolean,
): Promise<Capture> {
  const { width, height } = ECRANS[ecran];
  const resultat = await navigateur.quickAction("screenshot", {
    url,
    viewport: { width, height, deviceScaleFactor: 1 },
    screenshotOptions: { fullPage: pleinePage, type: "jpeg", quality: QUALITE_JPEG },
    gotoOptions: { waitUntil: "networkidle0", timeout: 30_000 },
    setExtraHTTPHeaders: enTetes,
  });

  const octets = await octetsDeLaCapture(resultat);
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
