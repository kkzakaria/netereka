import type { ProductAttribute } from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { descriptionToHtml } from "@/lib/utils/description-to-html";

interface ProductDetailsProps {
  description: string | null;
  descriptionType?: string;
  productId?: string;
  attributes: ProductAttribute[];
}

export function ProductDetails({ description, descriptionType, productId, attributes }: ProductDetailsProps) {
  const hasDescription = !!description;
  const filteredAttributes = attributes.filter((a) => a.name !== "Couleur");
  const hasAttributes = filteredAttributes.length > 0;

  if (!hasDescription && !hasAttributes) return null;

  // If only one section exists, render it directly without tabs
  if (!hasAttributes && hasDescription) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Description</h2>
        <DescriptionContent description={description} descriptionType={descriptionType} productId={productId} />
      </section>
    );
  }

  if (hasAttributes && !hasDescription) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Caractéristiques</h2>
        <AttributesTable attributes={filteredAttributes} />
      </section>
    );
  }

  // Both exist: show tabs
  return (
    <section className="mt-10 border-t pt-8">
      <Tabs defaultValue="description">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="description" className="text-sm">
            Description
          </TabsTrigger>
          <TabsTrigger value="characteristics" className="text-sm">
            Caractéristiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <DescriptionContent description={description!} descriptionType={descriptionType} productId={productId} />
        </TabsContent>

        <TabsContent value="characteristics">
          <AttributesTable attributes={filteredAttributes} />
        </TabsContent>
      </Tabs>
    </section>
  );
}


function DescriptionContent({
  description,
  descriptionType,
  productId,
}: {
  description: string | null;
  descriptionType?: string;
  productId?: string;
}) {
  if (!description) return null;
  const html = descriptionToHtml(description, descriptionType);
  if (!html) return null;

  const scopeClass =
    descriptionType === "html" && productId ? `desc-${productId}` : undefined;

  return (
    <div
      className={`prose prose-sm max-w-prose dark:prose-invert ${scopeClass ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
          <dt className="shrink-0 text-sm text-muted-foreground">
            {attr.name}
          </dt>
          <dd className="ml-auto text-right text-sm font-medium">
            {attr.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
