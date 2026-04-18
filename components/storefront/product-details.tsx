import type {
  ProductAttribute,
  ProductFaqItem,
  ProductFeatureBlock,
  ProductHighlight,
} from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductStory } from "./product-story";

interface ProductDetailsProps {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  featureBlocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
  description: string | null;
  descriptionType?: string;
  productId: string;
  attributes: ProductAttribute[];
}

function hasStoryContent({
  tagline,
  highlights,
  featureBlocks,
  faq,
  description,
}: Pick<
  ProductDetailsProps,
  "tagline" | "highlights" | "featureBlocks" | "faq" | "description"
>): boolean {
  if (tagline) return true;
  if (highlights && highlights.length > 0) return true;
  if (featureBlocks && featureBlocks.length > 0) return true;
  if (faq && faq.length > 0) return true;
  if (description && description.trim()) return true;
  return false;
}

export function ProductDetails({
  tagline,
  highlights,
  featureBlocks,
  faq,
  description,
  descriptionType,
  productId,
  attributes,
}: ProductDetailsProps) {
  const hasStory = hasStoryContent({
    tagline,
    highlights,
    featureBlocks,
    faq,
    description,
  });
  const filteredAttributes = attributes.filter((a) => a.name !== "Couleur");
  const hasAttributes = filteredAttributes.length > 0;

  if (!hasStory && !hasAttributes) return null;

  const story = (
    <ProductStory
      tagline={tagline}
      highlights={highlights}
      featureBlocks={featureBlocks}
      faq={faq}
      description={description}
      descriptionType={descriptionType}
      productId={productId}
    />
  );

  if (hasStory && !hasAttributes) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Description</h2>
        {story}
      </section>
    );
  }

  if (hasAttributes && !hasStory) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Caractéristiques</h2>
        <AttributesTable attributes={filteredAttributes} />
      </section>
    );
  }

  return (
    <section className="mt-10 border-t pt-8">
      <Tabs defaultValue="description">
        <TabsList variant="line" className="mb-6 min-h-11">
          <TabsTrigger value="description" className="px-3 text-sm">
            Description
          </TabsTrigger>
          <TabsTrigger value="characteristics" className="px-3 text-sm">
            Caractéristiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description">{story}</TabsContent>

        <TabsContent value="characteristics">
          <AttributesTable attributes={filteredAttributes} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function AttributesTable({ attributes }: { attributes: ProductAttribute[] }) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
      {attributes.map((attr) => (
        <div
          key={attr.id}
          className="flex items-baseline gap-4 bg-background px-4 py-3"
        >
          <dt className="shrink-0 text-sm text-muted-foreground">{attr.name}</dt>
          <dd className="ml-auto text-right text-sm font-medium">{attr.value}</dd>
        </div>
      ))}
    </dl>
  );
}
