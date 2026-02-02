import Link from "next/link";
import type { Product } from "@/lib/db/types";
import { ProductCard } from "@/components/storefront/product-card";

export function HorizontalSection({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="[content-visibility:auto] [contain-intrinsic-size:auto_300px]">
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
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:gap-4">
        {products.map((product) => (
          <div key={product.id} className="w-[160px] shrink-0 sm:w-[200px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
