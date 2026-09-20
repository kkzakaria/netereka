import type { ReactNode } from "react";
import type { ProductAttribute } from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductStory } from "./product-story";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

export type ProductTabId = "description" | "details" | "reviews" | "faq";

interface ProductDetailsProps {
  description: string | null;
  descriptionType?: string;
  faqHtml: string | null;
  productId: string;
  attributes: ProductAttribute[];
  /** La page calcule déjà `ratingStats` pour le JSON-LD (schema.org) — ce
   *  drapeau ne coûte donc aucune requête supplémentaire. Sert uniquement à
   *  distinguer, quand « Avis » est le seul onglet, un produit qui a déjà des
   *  avis (la section s'affiche) d'un produit qui n'en a aucun (la section
   *  ne s'affiche pas — voir le early return ci-dessous). */
  hasReviews: boolean;
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

/**
 * Faut-il rendre la section à onglets (celle que ProductDetails retourne) ?
 *
 * « Avis » est toujours dans `tabs` (voir visibleProductTabs), donc un
 * produit sans description, sans attribut visible et sans FAQ s'y résume
 * toujours. Avant ce lot, ProductDetails renvoyait null dans ce cas et la
 * page s'arrêtait simplement là ; sans ce garde, ces produits afficheraient
 * une section bordée dont le seul onglet dit « Aucun avis pour le moment » —
 * pire que pas de section du tout. `hasReviews` distingue ce cas (aucune
 * section) du même onglet unique mais avec de vrais avis (section affichée
 * normalement).
 */
export function shouldRenderProductDetails(
  tabs: ProductTabId[],
  hasReviews: boolean
): boolean {
  return !(tabs.length === 1 && tabs[0] === "reviews" && !hasReviews);
}

export function ProductDetails({
  description,
  descriptionType,
  faqHtml,
  productId,
  attributes,
  hasReviews,
  reviews,
}: ProductDetailsProps) {
  // La couleur est déjà exposée par le sélecteur de variante : la répéter dans
  // le tableau des caractéristiques est du bruit.
  const filteredAttributes = attributes.filter((a) => a.name !== "Couleur");

  // Assaini à la lecture comme les bannières (lib/db/storefront/banners.ts) et
  // la description (lib/utils/description-to-html.ts) : la garantie d'écriture
  // (scripts/convert-content-to-html.ts) suppose qu'aucun écrivain futur ne la
  // contourne — les tâches 14-15 sont justement l'arrivée de ce futur
  // écrivain. Ré-assainir ici est idempotent et ne coûte rien au bundle
  // navigateur : ProductDetails est un composant serveur (pas de "use client").
  // Calculé avant `visibleProductTabs` pour qu'une valeur non-vide qui
  // s'assainit en chaîne vide (ex: contenu entièrement fait de balises
  // interdites) ne produise pas un onglet FAQ sans panneau : les deux se
  // décident désormais sur la même valeur, `faqHtmlSafe`.
  const faqHtmlSafe = faqHtml ? sanitizeDescriptionHtml(faqHtml, productId) : null;

  const tabs = visibleProductTabs({
    description,
    faqHtml: faqHtmlSafe,
    attributeCount: filteredAttributes.length,
  });

  if (!shouldRenderProductDetails(tabs, hasReviews)) {
    return null;
  }

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

        {tabs.includes("faq") && faqHtmlSafe && (
          <TabsContent value="faq">
            {/* Assaini à l'écriture ET à la lecture (faqHtmlSafe ci-dessus).
                Le conteneur Description partage le même scope `desc-<productId>`
                que celui-ci : sans risque tant que Radix démonte les
                TabsContent inactifs (seul l'onglet actif est dans le DOM) — si
                un jour un `forceMount` est ajouté pour du SEO, le <style>
                scopé de l'un pourrait atteindre l'autre. */}
            <div
              className={`desc-${productId}`}
              dangerouslySetInnerHTML={{ __html: faqHtmlSafe }}
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
