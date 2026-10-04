/**
 * De VRAIS en-têtes de fichiers image, pour les tests des portes de
 * téléversement.
 *
 * Depuis que le format est décidé par les octets et non par ce que le client
 * déclare, un `new File([1,2,3,4], "x.png", { type: "image/png" })` n'est
 * plus une image : c'est précisément ce que la porte doit refuser. Les tests
 * qui en forgeaient un éprouvaient donc un chemin qui n'existe plus.
 *
 * Seuls les premiers octets comptent (douze au plus) : le reste est du
 * remplissage, et aucun décodeur ne lit ces fichiers.
 */
const SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/jpg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  // RIFF????WEBP : la taille (octets 4–7) n'est pas lue par la détection.
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  // ????ftypavif : un AVIF honnête, pour éprouver le refus par les octets.
  "image/avif": [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
  "image/gif": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
};

/** Les octets d'un format, ou quatre octets quelconques pour un type inconnu. */
export function octetsDe(type: string, taille = 32): Uint8Array<ArrayBuffer> {
  // Une taille 0 reste 0 : le fichier vide est un cas de test légitime, que
  // les portes refusent AVANT de regarder quoi que ce soit.
  if (taille === 0) return new Uint8Array(0);
  const tete = SIGNATURES[type.toLowerCase()] ?? [0x00, 0x01, 0x02, 0x03];
  const buf = new Uint8Array(Math.max(taille, tete.length));
  buf.set(tete, 0);
  return buf;
}

/**
 * Un fichier dont les OCTETS et le TYPE DÉCLARÉ peuvent diverger — le cas
 * qu'un navigateur produit tout seul quand on renomme un `.avif` en `.png`,
 * puisqu'il déduit le type de l'extension.
 */
export function fichierImage(
  declare: string,
  nom = "photo.png",
  octetsDeType: string = declare,
  taille?: number,
): File {
  return new File([octetsDe(octetsDeType, taille)], nom, { type: declare });
}
