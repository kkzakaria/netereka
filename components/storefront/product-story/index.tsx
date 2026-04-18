import type {
  ProductHighlight,
  ProductFeatureBlock,
  ProductFaqItem,
} from "@/lib/db/types";
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { StoryTagline } from "./story-tagline";
import { StoryHighlights } from "./story-highlights";
import { StoryFeatureBlock } from "./story-feature-block";
import { StoryFaq } from "./story-faq";
import { StoryFreeContent } from "./story-free-content";

interface ProductStoryProps {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  featureBlocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
  description: string | null;
  descriptionType?: string;
  productId?: string;
}

function hasFreeContent(description: string | null, descriptionType?: string): boolean {
  if (!description) return false;
  return !!descriptionToHtml(description, descriptionType);
}

/**
 * Full-width product story. Renders nothing if every block is empty.
 * The root <section> is expected to live OUTSIDE the page's max-w-7xl wrapper.
 */
export function ProductStory({
  tagline,
  highlights,
  featureBlocks,
  faq,
  description,
  descriptionType,
  productId,
}: ProductStoryProps) {
  const hasTagline = !!tagline;
  const hasHighlights = !!highlights && highlights.length > 0;
  const hasFeatureBlocks = !!featureBlocks && featureBlocks.length > 0;
  const hasFaq = !!faq && faq.length > 0;
  const hasFree = hasFreeContent(description, descriptionType);

  if (!hasTagline && !hasHighlights && !hasFeatureBlocks && !hasFaq && !hasFree) {
    return null;
  }

  // Alternate feature-block backgrounds to create rhythm.
  // Intro (tagline + highlights) share the base background;
  // feature blocks alternate; FAQ + free content share base again.
  return (
    <section className="w-full">
      {hasTagline && (
        <div className="py-16 sm:py-24">
          <StoryTagline tagline={tagline!} />
        </div>
      )}
      {hasHighlights && (
        <div className="bg-muted/30 py-16 sm:py-24">
          <StoryHighlights highlights={highlights!} />
        </div>
      )}
      {hasFeatureBlocks &&
        featureBlocks!.map((block, i) => (
          <div
            key={`feature-${i}-${block.title.slice(0, 40)}`}
            className={i % 2 === 0 ? "py-16 sm:py-24" : "bg-muted/30 py-16 sm:py-24"}
          >
            <StoryFeatureBlock block={block} index={i} />
          </div>
        ))}
      {hasFaq && (
        <div className="py-16 sm:py-24">
          <StoryFaq faq={faq!} />
        </div>
      )}
      {hasFree && (
        <div className="py-16 sm:py-24">
          <StoryFreeContent
            description={description!}
            descriptionType={descriptionType}
            productId={productId}
          />
        </div>
      )}
    </section>
  );
}
