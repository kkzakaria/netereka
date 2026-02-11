import type { ProductAttribute } from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductDetailsProps {
  description: string | null;
  attributes: ProductAttribute[];
}

export function ProductDetails({ description, attributes }: ProductDetailsProps) {
  const hasDescription = !!description;
  const hasAttributes = attributes.length > 0;

  if (!hasDescription && !hasAttributes) return null;

  // If only one section exists, render it directly without tabs
  if (!hasAttributes && hasDescription) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Description</h2>
        <DescriptionContent description={description} />
      </section>
    );
  }

  if (hasAttributes && !hasDescription) {
    return (
      <section className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Caractéristiques</h2>
        <AttributesTable attributes={attributes} />
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
          <DescriptionContent description={description!} />
        </TabsContent>

        <TabsContent value="characteristics">
          <AttributesTable attributes={attributes} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function DescriptionContent({ description }: { description: string | null }) {
  if (!description) return null;

  // Split by double newlines for paragraph breaks
  const paragraphs = description.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="max-w-prose space-y-3">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-sm leading-relaxed text-muted-foreground">
          {paragraph}
        </p>
      ))}
    </div>
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
