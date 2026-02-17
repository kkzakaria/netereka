"use client";

import Link from "next/link";
import type { ProductCardData } from "@/lib/db/types";
import { ProductCard } from "@/components/storefront/product-card";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import { ScrollButtons } from "@/components/storefront/scroll-buttons";

export function HorizontalSection({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: ProductCardData[];
}) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll, dragProps } =
    useHorizontalScroll();

  if (products.length === 0) return null;

  // no content-visibility:auto — contain:paint clips overflow-x scrolling
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
      <div className="group relative">
        <ScrollButtons
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScroll={scroll}
        />
        <div
          ref={scrollRef}
          {...dragProps}
          className="flex cursor-grab select-none gap-3 overflow-x-auto pb-2 scrollbar-none active:cursor-grabbing sm:gap-4"
        >
          {products.map((product) => (
            <div key={product.id} className="w-[160px] shrink-0 sm:w-[200px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
