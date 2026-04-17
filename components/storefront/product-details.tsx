import type { ProductAttribute } from "@/lib/db/types";

interface ProductSpecsProps {
  attributes: ProductAttribute[];
}

/**
 * Product characteristics section. Renders a 2-column key/value grid.
 * Returns null if there are no displayable attributes (the "Couleur"
 * attribute is filtered out because it's surfaced by the color variant UI).
 */
export function ProductSpecs({ attributes }: ProductSpecsProps) {
  const filtered = attributes.filter((a) => a.name !== "Couleur");
  if (filtered.length === 0) return null;

  return (
    <section className="mt-12 border-t pt-10">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">
        Caractéristiques
      </h2>
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
        {filtered.map((attr) => (
          <div
            key={attr.id}
            className="flex items-baseline gap-4 bg-background px-4 py-3"
          >
            <dt className="shrink-0 text-sm text-muted-foreground">{attr.name}</dt>
            <dd className="ml-auto text-right text-sm font-medium">{attr.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
