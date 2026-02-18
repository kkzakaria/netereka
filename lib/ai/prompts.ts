export function productTextPrompt(input: {
  name: string;
  categoryName?: string;
  brand?: string;
}) {
  const context = [
    `Nom du produit: ${input.name}`,
    input.brand ? `Marque: ${input.brand}` : null,
    input.categoryName ? `Catégorie: ${input.categoryName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system: `Tu es un rédacteur e-commerce spécialisé en électronique pour le marché ivoirien. Tu rédiges en français. Les prix sont en FCFA.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement ces clés :
- "description": description détaillée du produit (2-3 phrases, max 500 caractères)
- "shortDescription": résumé accrocheur en une phrase (max 150 caractères)
- "metaTitle": titre SEO optimisé (max 60 caractères)
- "metaDescription": description SEO (max 160 caractères)`,
    user: context,
  };
}

export function bannerTextPrompt(input: {
  productName?: string;
  promotion?: string;
  theme?: string;
}) {
  const context = [
    input.productName ? `Produit: ${input.productName}` : null,
    input.promotion ? `Promotion: ${input.promotion}` : null,
    input.theme ? `Thème: ${input.theme}` : null,
  ]
    .filter(Boolean)
    .join("\n") || "Bannière promotionnelle générale pour un site e-commerce d'électronique en Côte d'Ivoire";

  return {
    system: `Tu es un copywriter spécialisé en bannières promotionnelles e-commerce pour le marché ivoirien. Tu rédiges en français. Sois accrocheur et concis.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement ces clés :
- "title": titre principal de la bannière (max 50 caractères, percutant)
- "subtitle": sous-titre descriptif (max 100 caractères)
- "ctaText": texte du bouton d'action (max 20 caractères, ex: "Découvrir", "Profiter")
- "badgeText": texte du badge optionnel (max 20 caractères, ex: "Nouveau", "Promo -30%", ou "" si pas pertinent)`,
    user: context,
  };
}

export function categorySuggestionPrompt(input: {
  productName: string;
  description?: string;
  categories: Array<{ id: string; name: string; parentName?: string }>;
}) {
  const categoryList = input.categories
    .map(
      (c) =>
        `- id: "${c.id}", nom: "${c.parentName ? `${c.parentName} > ${c.name}` : c.name}"`
    )
    .join("\n");

  const context = [
    `Produit: ${input.productName}`,
    input.description ? `Description: ${input.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system: `Tu es un expert en classification de produits électroniques. Tu dois classer un produit dans les catégories existantes d'un site e-commerce.

Voici les catégories disponibles :
${categoryList}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement cette clé :
- "suggestions": un tableau de 3 objets, chacun avec "categoryId" (string, doit être un id de la liste ci-dessus), "categoryName" (string), et "confidence" (number entre 0 et 1)

Classe les suggestions de la plus pertinente à la moins pertinente.`,
    user: context,
  };
}

export function bannerImagePrompt(input: {
  prompt: string;
  style?: "product" | "abstract" | "lifestyle";
}) {
  const styleGuide: Record<string, string> = {
    product: "Product showcase photography, clean background, professional lighting",
    abstract: "Abstract geometric shapes, modern gradients, tech-inspired patterns",
    lifestyle: "Lifestyle scene, people using technology, warm and inviting atmosphere",
  };

  const style = styleGuide[input.style ?? "abstract"];

  return `${input.prompt}, ${style}, e-commerce banner, high quality, 16:9 aspect ratio, navy blue and mint green color scheme`;
}
