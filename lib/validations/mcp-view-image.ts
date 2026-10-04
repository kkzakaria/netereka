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

/**
 * Une clé du stockage : `products/<id>/<nom>` ou `banners/<nom>`.
 *
 * Ce n'est PAS une garde de sécurité, et il ne faut pas la lire comme telle :
 * R2 est un espace de noms PLAT, où `..` et `//` ne désignent aucune
 * traversée — ce sont des caractères comme les autres dans une clé. C'est un
 * refus de FORME, pour que l'outil puisse dire « ni une URL, ni une clé »
 * plutôt que de partir chercher un objet absent et de rendre « introuvable »,
 * qui envoie corriger la mauvaise chose.
 *
 * Les segments vides sont refusés (`products//x`, `products/x/`) parce
 * qu'aucun de nos chemins d'écriture n'en produit. Un point double, lui, est
 * accepté : `photo..jpg` est un nom de fichier légitime, et l'interdire
 * refusait une clé héritée sans raison.
 */
const CLE_VALIDE = /^(products|banners)\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;

export function estCleDeStockage(valeur: string): boolean {
  return CLE_VALIDE.test(valeur);
}
