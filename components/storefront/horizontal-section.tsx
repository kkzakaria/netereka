import Link from "next/link";
import type { ProductCardData } from "@/lib/db/types";
import { ProductCard } from "@/components/storefront/product-card";
import { ScrollContainer } from "@/components/storefront/scroll-container";

export function HorizontalSection({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="text-sm font-medium text-primary hover:underline"
          >
            Voir tout
          </Link>
        ) : null}
      </div>
      <ScrollContainer>
        {products.map((product) => (
          <div key={product.id} className="w-[160px] shrink-0 sm:w-[200px]">
            <ProductCard product={product} />
          </div>
        ))}
      </ScrollContainer>
    </section>
  );
}
