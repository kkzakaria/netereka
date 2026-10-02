import { z } from "zod";

/**
 * Entrées des deux outils d'images du MCP.
 *
 * `lib/media/image-search.ts` revalide et borne déjà `query` et `count` —
 * c'est voulu : cette fonction est appelable hors du MCP et ne doit pas
 * dépendre de son appelant pour sa propre garde. Les schémas ici servent à
 * refuser plus tôt, avec un -32602 du SDK, plutôt qu'à remplacer cette garde.
 */

/** Recherche d'images de référence : la requête telle qu'on l'enverrait à un
 *  moteur, pas un identifiant de produit. */
export const searchProductImagesShape = {
  query: z.string().trim().min(2).max(200),
  count: z.number().int().min(1).max(20).optional(),
};

/**
 * Génération d'une image produit en mode édition.
 *
 * `source_image_id` est une image DÉJÀ attachée au produit, pas une URL :
 * c'est ce qui garantit que le visuel composé montre l'objet réellement
 * livré. Sur une boutique en paiement à la livraison, un visuel qui ne
 * correspond pas se paie en colis refusé à la porte du client.
 */
export const generateProductImageShape = {
  product_id: z.string().trim().min(1),
  source_image_id: z.string().trim().min(1),
  prompt: z.string().trim().min(10).max(1000),
  alt: z.string().trim().max(300).optional(),
};
