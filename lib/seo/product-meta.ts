/**
 * Meta description produit : garantit TOUJOURS les signaux de recherche
 * locale (prix FCFA, Abidjan, paiement à la livraison), que le produit
 * ait une short_description ou non. Motivé par les requêtes GSC réelles
 * du type « <produit> prix abidjan ».
 */
const MAX_META_LENGTH = 160;
const TRAILING_PUNCT = /[.,!?;:…\s]+$/u;

function clipAtWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, max)).replace(TRAILING_PUNCT, "");
}

export function buildProductMetaDescription(
  name: string,
  price: string,
  shortDescription?: string | null
): string {
  const suffix = "Livraison rapide à Abidjan, paiement à la livraison.";
  const lead = shortDescription?.trim().replace(TRAILING_PUNCT, "");
  if (lead) {
    // Les signaux locaux sont en fin de chaîne : on clippe le lead pour que
    // le total tienne dans la fenêtre SERP, sinon ce sont eux qui sautent.
    const tail = `. Prix : ${price} en Côte d'Ivoire. ${suffix}`;
    const clipped = clipAtWordBoundary(lead, MAX_META_LENGTH - tail.length);
    if (clipped) return `${clipped}${tail}`;
  }
  return `Achetez ${name} au prix de ${price} en Côte d'Ivoire. ${suffix}`;
}
