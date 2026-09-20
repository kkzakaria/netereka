import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { StoryFreeContent } from "./story-free-content";

interface ProductStoryProps {
  description: string | null;
  descriptionType?: string;
  productId?: string;
}

/**
 * Contenu de l'onglet Description : un unique bloc de contenu libre.
 *
 * Les blocs structurés (tagline, highlights, feature blocks, FAQ) ont été
 * convertis en HTML et retirés — la FAQ ayant désormais son propre onglet.
 */
export function ProductStory({ description, descriptionType, productId }: ProductStoryProps) {
  if (!description) return null;
  const html = descriptionToHtml(description, descriptionType, productId);
  if (!html) return null;
  return (
    <section className="w-full">
      <StoryFreeContent html={html} descriptionType={descriptionType} productId={productId} />
    </section>
  );
}
