import { z } from "zod";

/**
 * Contrat d'entrée de `view_image` (lib/mcp/tools/images.ts).
 *
 * Un seul champ, qui accepte DEUX formes : une URL http(s) publique (un
 * candidat de `search_product_images`, par exemple) ou une clé du stockage de
 * la boutique (ce que rendent `get_product` et `set_banner_image`). Deux
 * champs mutuellement exclusifs auraient obligé l'appelant à savoir laquelle
 * il tient — or il recopie ce qu'un autre outil vient de lui rendre.
 */
export const viewImageShape = {
  image: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .describe("URL http(s) publique, ou clé de stockage rendue par un autre outil"),
};

/** Une clé du stockage : `products/<id>/<nom>` ou `banners/<nom>`, rien
 *  d'autre. Le refus est explicite plutôt que silencieux — une chaîne qui
 *  n'est ni une URL ni une clé partirait sinon chercher un objet absent et
 *  reviendrait « introuvable », ce qui ne dit pas que la FORME est fautive. */
const CLE_VALIDE = /^(products|banners)\/[A-Za-z0-9._\-/]+$/;

export function estCleDeStockage(valeur: string): boolean {
  return CLE_VALIDE.test(valeur) && !valeur.includes("..") && !valeur.includes("//");
}
