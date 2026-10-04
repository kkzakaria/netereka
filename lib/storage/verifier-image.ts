import { ALLOWED_IMAGE_TYPES, OCTETS_DE_SIGNATURE, extensionPour, formatDesOctets } from "./fetch-image";

/**
 * La porte d'entrée commune des téléversements d'administration.
 *
 * Elle existe pour qu'une réponse unique soit donnée à la même question dans
 * toutes les portes — produits, bannières, descriptions —, et surtout pour
 * que le format soit décidé par LES OCTETS et non par ce que le client
 * déclare.
 *
 * Le type déclaré reste une première barrière, parce qu'il coûte zéro octet
 * de lecture et qu'il écarte le gros des erreurs honnêtes. Mais il ne
 * tranche pas : un navigateur le déduit de l'extension, donc un « .avif »
 * renommé « .png » arrive avec `image/png` sans que personne n'ait menti.
 *
 * Ce que le résultat garantit, et c'est le seul gain de sécurité réel ici :
 * la valeur rendue sert À LA FOIS d'extension de clé et de `Content-Type`
 * stocké sur l'objet R2 (`uploadToR2` écrit `file.type`). Les deux viennent
 * donc des octets, et R2 ne servira jamais un `Content-Type` qu'un client
 * aurait choisi.
 */
export type VerificationImage =
  | { ok: true; type: string; extension: string }
  | { ok: false; erreur: string };

const REFUS_LISTE = "Nous n'acceptons que le JPEG, le PNG et le WebP.";

export async function verifierImageTeleversee(file: File): Promise<VerificationImage> {
  const declare = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(declare)) {
    return {
      ok: false,
      erreur: `Format non pris en charge (${file.type || "inconnu"}). ${REFUS_LISTE} Convertissez l'image avant de la déposer.`,
    };
  }

  const tete = new Uint8Array(await file.slice(0, OCTETS_DE_SIGNATURE).arrayBuffer());
  const reel = formatDesOctets(tete);

  if (reel === null) {
    return {
      ok: false,
      erreur:
        `Ce fichier se déclare ${declare} mais ses octets ne sont ni du JPEG, ni du PNG, ni du WebP. ` +
        "Il n'a pas été déposé.",
    };
  }
  if ("avif" in reel) {
    // Le cas COURANT du renommage : un navigateur déduit le type de
    // l'extension, donc un AVIF renommé .png se déclare image/png.
    return {
      ok: false,
      erreur:
        "Ce fichier est un AVIF, quelle que soit son extension. " +
        `${REFUS_LISTE} Le redimensionneur de la vitrine ne lit pas l'AVIF : l'image serait invisible en ligne.`,
    };
  }

  return { ok: true, type: reel.type, extension: extensionPour(reel.type) };
}
