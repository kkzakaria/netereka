/**
 * Meta description produit : garantit TOUJOURS les signaux de recherche
 * locale (prix FCFA, Abidjan, paiement à la livraison), que le produit
 * ait une short_description ou non. Motivé par les requêtes GSC réelles
 * du type « <produit> prix abidjan ».
 */
export function buildProductMetaDescription(
  name: string,
  price: string,
  shortDescription?: string | null
): string {
  const suffix = "Livraison rapide à Abidjan, paiement à la livraison.";
  const lead = shortDescription?.trim().replace(/[.\s]+$/u, "");
  if (lead) {
    return `${lead}. Prix : ${price} en Côte d'Ivoire. ${suffix}`;
  }
  return `Achetez ${name} au prix de ${price} en Côte d'Ivoire. ${suffix}`;
}
