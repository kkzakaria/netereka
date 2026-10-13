/**
 * Le laissez-passer d'un capteur d'écran vers UNE page d'aperçu, pour UNE
 * minute.
 *
 * LE PROBLÈME. `/apercu/<type>/<revision>` est réservé aux administrateurs, et
 * c'est sa raison d'être : une révision n'est nulle part tant qu'elle n'est pas
 * appliquée. Mais l'outil MCP `apercu_revision` photographie cette page par
 * Browser Run, c'est-à-dire depuis l'infrastructure de Cloudflare — une requête
 * qui ne porte ni cookie ni session. Sans rien, le capteur ramènerait la photo
 * de la page de connexion.
 *
 * CE QUI A ÉTÉ ÉCARTÉ, ET POURQUOI.
 *
 *  - Un jeton dans l'URL (`?jeton=…`). Refusé : une URL se retrouve dans les
 *    journaux, les en-têtes `Referer` et l'historique du capteur. Un
 *    laissez-passer ne se met pas dans une adresse.
 *  - Un vrai cookie de session, que Browser Run sait aussi poser. Refusé :
 *    une session fuitée est un accès administrateur COMPLET et durable, là où
 *    ce jeton-ci ne peut rien faire d'autre que regarder une seule page
 *    pendant une minute. Le pire cas est incomparable.
 *  - Rendre `/apercu` public mais « imprévisible ». Refusé : cela exposerait
 *    durablement du contenu non publié à quiconque apprend un identifiant,
 *    sans expiration ni portée.
 *
 * CE QUI EST FAIT. Un COOKIE à portée de chemin, posé par Browser Run avant la
 * navigation, portant une signature HMAC-SHA256 qui couvre le sujet exact et
 * une date d'expiration. Le jeton ne vaut donc que pour la révision pour
 * laquelle il a été émis : il ne se promène pas d'une révision à l'autre, et
 * encore moins vers `/admin`.
 *
 * UN COOKIE ET PAS UN EN-TÊTE, ET CE N'EST PAS UN DÉTAIL. La première version
 * posait `setExtraHTTPHeaders` — et un en-tête supplémentaire est envoyé par
 * le navigateur à TOUTES les requêtes de la page, pas au seul document. La
 * page d'aperçu hérite du gabarit vitrine : elle demande ses images à
 * `r2.netereka.ci` (vérifié dans le HTML servi) et chargerait Google Tag
 * Manager dès qu'un identifiant GA serait configuré (`components/providers.tsx`
 * monte déjà le composant). Le laissez-passer serait donc parti chez un tiers.
 *
 * Un cookie, lui, est porté par la portée pour laquelle il a été émis :
 * `path` = le chemin exact de l'aperçu. Les images (`/banners/…`), les
 * transformations (`/cdn-cgi/image/…`) et les actifs (`/_next/static/…`) ne
 * correspondent pas à ce chemin, donc ne le reçoivent pas — et un autre
 * domaine ne le reçoit jamais. C'est le mécanisme conçu pour ce problème,
 * plutôt qu'un en-tête qu'il faudrait filtrer à la main.
 *
 * REJOUABLE PENDANT SA FENÊTRE, ET C'EST ASSUMÉ. Il n'y a ni nonce ni usage
 * unique : qui obtient un jeton valide peut le rejouer pendant les secondes
 * qui restent. Le marché est tenable — une page, une minute, en lecture seule,
 * et un contenu que son détenteur a de toute façon composé lui-même — et le
 * rendre à usage unique exigerait un état partagé (KV) sur un chemin qui doit
 * rester une vérification locale. Mais c'est une propriété du schéma, pas un
 * oubli : elle est écrite ici pour qu'on la retrouve plutôt que de la
 * redécouvrir.
 *
 * PAS DE NOUVEAU SECRET À POSER. La clé est DÉRIVÉE de `BETTER_AUTH_SECRET`
 * par un HMAC sur une étiquette fixe. Une clé dérivée avec séparation de
 * domaine ne permet pas de forger une signature de session, et réciproquement
 * — alors qu'un secret de plus serait un secret à poser, à faire tourner, et
 * à oublier un jour dans un environnement sur deux (le garde-fou de dérive
 * existe précisément parce que cela nous est arrivé).
 */

/** Étiquette de séparation de domaine. La changer invalide tous les jetons. */
const ETIQUETTE = "netereka/apercu-capture/v1";

/**
 * Nom du cookie qui porte le jeton.
 *
 * Sans préfixe `__Host-` : celui-ci interdit l'attribut `Path` autre que `/`,
 * or la portée de chemin est précisément ce qui empêche la fuite vers les
 * images et les actifs. On échange une garantie d'origine — que l'on n'a pas
 * besoin ici, le jeton étant signé et vérifié — contre la seule qui compte.
 */
export const NOM_COOKIE_CAPTURE = "netereka_apercu";

/** Durée de vie à l'émission. Une capture prend quelques secondes. */
export const DUREE_DE_VIE_MS = 60_000;

/**
 * Durée de vie maximale ACCEPTÉE à la vérification, indépendamment de ce que
 * le jeton annonce.
 *
 * Ce n'est pas une redondance de `DUREE_DE_VIE_MS` : la signature couvre
 * l'expiration, donc un jour où un appel passerait `exp` à un an, le jeton
 * serait parfaitement valide. Ce plafond-ci est le seul endroit qui refuse un
 * laissez-passer durable même correctement signé.
 */
export const DUREE_DE_VIE_MAX_MS = 120_000;

function base64url(octets: ArrayBuffer): string {
  const binaire = String.fromCharCode(...new Uint8Array(octets));
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * `TextEncoder` et `Uint8Array.from` rendent un `Uint8Array<ArrayBufferLike>`,
 * que `crypto.subtle` refuse en TypeScript (il pourrait porter un
 * `SharedArrayBuffer`). On recopie donc dans un `ArrayBuffer` franc, une fois,
 * ici — plutôt que de semer des assertions de type sur chaque appel.
 */
function versArrayBuffer(vue: Uint8Array): ArrayBuffer {
  const tampon = new ArrayBuffer(vue.byteLength);
  new Uint8Array(tampon).set(vue);
  return tampon;
}

function octetsDuTexte(texte: string): ArrayBuffer {
  return versArrayBuffer(new TextEncoder().encode(texte));
}

function deBase64url(valeur: string): ArrayBuffer | null {
  // `atob` lève sur une entrée mal formée, et cette entrée vient du réseau.
  try {
    const binaire = atob(valeur.replace(/-/g, "+").replace(/_/g, "/"));
    return versArrayBuffer(Uint8Array.from(binaire, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

/**
 * La clé de signature, dérivée du secret d'authentification.
 *
 * Deux HMAC : le premier dérive, le second signe. On n'utilise JAMAIS
 * `BETTER_AUTH_SECRET` directement comme clé de signature d'un jeton
 * applicatif.
 */
async function cleDeSignature(secret: string): Promise<CryptoKey> {
  const cleDeDerivation = await crypto.subtle.importKey(
    "raw",
    octetsDuTexte(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const derivee = await crypto.subtle.sign("HMAC", cleDeDerivation, octetsDuTexte(ETIQUETTE));
  return crypto.subtle.importKey("raw", derivee, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/**
 * Ce qui est signé.
 *
 * Le chemin est inclus TEL QUEL et séparé de l'expiration par un retour à la
 * ligne — un caractère qu'un chemin d'URL ne peut pas contenir. Sans ce
 * séparateur, `/a/b` + `12` et `/a/b1` + `2` produiraient le même message, et
 * un jeton émis pour une page en vaudrait un pour une autre.
 */
export function messageSigne(chemin: string, expiration: number): string {
  return `${chemin}\n${expiration}`;
}

function message(chemin: string, expiration: number): ArrayBuffer {
  return octetsDuTexte(messageSigne(chemin, expiration));
}

/** Émettre un laissez-passer pour ce chemin exact. */
export async function emettreJetonDeCapture(
  secret: string,
  chemin: string,
  maintenantMs: number = Date.now(),
): Promise<string> {
  const expiration = maintenantMs + DUREE_DE_VIE_MS;
  const cle = await cleDeSignature(secret);
  const signature = await crypto.subtle.sign("HMAC", cle, message(chemin, expiration));
  return `${expiration}.${base64url(signature)}`;
}

export type VerdictCapture = { valide: true } | { valide: false; raison: string };

/**
 * Vérifier un laissez-passer.
 *
 * Rend TOUJOURS un motif, jamais une exception : l'appelant doit pouvoir
 * journaliser pourquoi une capture a été refusée sans que la raison parte au
 * client (une page d'aperçu refusée répond 404, pas une explication).
 */
export async function verifierJetonDeCapture(
  secret: string,
  chemin: string,
  jeton: string | null | undefined,
  maintenantMs: number = Date.now(),
): Promise<VerdictCapture> {
  if (!jeton) return { valide: false, raison: "cookie absent" };

  const separateur = jeton.indexOf(".");
  if (separateur <= 0) return { valide: false, raison: "forme invalide" };

  const brutExpiration = jeton.slice(0, separateur);
  // `Number()` accepterait « 1e20 », «  12  », « +12 » et « 0x10 » : on exige
  // des chiffres décimaux SANS zéro initial, pour que ce qui est vérifié soit
  // exactement ce qui a été signé — et pour que le jeton n'ait qu'UNE écriture
  // valide. Sans l'interdiction du zéro initial, `0<exp>` passait le contrôle
  // et `Number()` le ramenait à `<exp>` : le même laissez-passer avait une
  // infinité de formes, toutes acceptées.
  if (!/^[1-9]\d*$/.test(brutExpiration)) return { valide: false, raison: "expiration illisible" };
  const expiration = Number(brutExpiration);

  if (expiration <= maintenantMs) return { valide: false, raison: "jeton expiré" };
  if (expiration - maintenantMs > DUREE_DE_VIE_MAX_MS) {
    return { valide: false, raison: "durée de vie au-delà du plafond accepté" };
  }

  const signature = deBase64url(jeton.slice(separateur + 1));
  if (!signature || signature.byteLength !== 32) {
    return { valide: false, raison: "signature mal formée" };
  }

  const cle = await cleDeSignature(secret);
  // `crypto.subtle.verify` compare en temps constant ; une comparaison de
  // chaînes fuirait la signature octet par octet.
  const bonne = await crypto.subtle.verify("HMAC", cle, signature, message(chemin, expiration));
  return bonne ? { valide: true } : { valide: false, raison: "signature invalide" };
}
