import type { ReactNode } from "react";
import type { ProductAttribute } from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductStory } from "./product-story";

export type ProductTabId = "description" | "details" | "reviews" | "faq";

interface ProductDetailsProps {
  description: string | null;
  descriptionType?: string;
  faqHtml: string | null;
  productId: string;
  attributes: ProductAttribute[];
  /** Rendu par la page : <Suspense><ProductReviews …/></Suspense>. ProductReviews
   *  est un composant serveur asynchrone et Tabs est client — il ne peut pas être
   *  appelé d'ici, seulement reçu. */
  reviews: ReactNode;
}

const TAB_LABELS: Record<ProductTabId, string> = {
  description: "Description",
  details: "Détails produit",
  reviews: "Avis",
  faq: "FAQ",
};

function filled(value: string | null): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * Onglets à afficher, dans l'ordre.
 *
 * « Avis » est toujours là, même sans aucun avis : c'est ce qui permet
 * d'inviter au premier. Les trois autres disparaissent quand leur source est
 * vide — un onglet vide est pire que pas d'onglet.
 */
export function visibleProductTabs(input: {
  description: string | null;
  faqHtml: string | null;
  attributeCount: number;
}): ProductTabId[] {
  const tabs: ProductTabId[] = [];
  if (filled(input.description)) tabs.push("description");
  if (input.attributeCount > 0) tabs.push("details");
  tabs.push("reviews");
  if (filled(input.faqHtml)) tabs.push("faq");
  return tabs;
}

export function ProductDetails({
  description,
  descriptionType,
  faqHtml,
  productId,
  attributes,
  reviews,
}: ProductDetailsProps) {
  // La couleur est déjà exposée par le sélecteur de variante : la répéter dans
  // le tableau des caractéristiques est du bruit.
  const filteredAttributes = attributes.filter((a) => a.name !== "Couleur");
  const tabs = visibleProductTabs({
    description,
    faqHtml,
    attributeCount: filteredAttributes.length,
  });

  return (
    <section className="mt-10 border-t pt-8">
      <Tabs defaultValue={tabs[0]}>
        <TabsList variant="line" className="mb-6 min-h-11">
          {tabs.map((id) => (
            <TabsTrigger key={id} value={id} className="px-3 text-sm">
              {TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.includes("description") && (
          <TabsContent value="description">
            <ProductStory
              description={description}
              descriptionType={descriptionType}
              productId={productId}
            />
          </TabsContent>
        )}

        {tabs.includes("details") && (
          <TabsContent value="details">
            <AttributesTable attributes={filteredAttributes} />
          </TabsContent>
        )}

        <TabsContent value="reviews">{reviews}</TabsContent>

        {tabs.includes("faq") && (
          <TabsContent value="faq">
            {/* Assaini à l'écriture, comme toute la famille du contenu libre. */}
            <div
              className={`desc-${productId}`}
              dangerouslySetInnerHTML={{ __html: faqHtml! }}
            />
          </TabsContent>
        )}
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
