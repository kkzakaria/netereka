/**
 * Encoder des octets en base64, par tranches.
 *
 * `String.fromCharCode(...bytes)` sur plusieurs centaines de kilo-octets
 * dépasse la limite d'arguments du moteur et lève un `RangeError`. Le
 * découpage est la seule raison d'être de cette fonction — et c'est
 * précisément pourquoi elle ne doit exister qu'une fois : trois copies d'un
 * contournement de cas limite, ce sont trois endroits où l'une peut perdre
 * le découpage sans que rien ne le dise.
 */
export function enBase64(octets: Uint8Array): string {
  const TRANCHE = 0x8000;
  let sortie = "";
  for (let i = 0; i < octets.length; i += TRANCHE) {
    sortie += String.fromCharCode(...octets.subarray(i, i + TRANCHE));
  }
  return btoa(sortie);
}
