export const dynamic = "force-dynamic";

import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategories } from "@/lib/db/categories";
import {
  getFeaturedProducts,
  getLatestProducts,
  getProductsByCategorySlug,
} from "@/lib/db/products";
import type { Category } from "@/lib/db/types";
import { CategoryNav } from "@/components/storefront/category-nav";
import { HeroBanner } from "@/components/storefront/hero-banner";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { TrustBadges } from "@/components/storefront/trust-badges";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HIGHLIGHTED_CATEGORIES = 3;

async function ProductSections({ categories }: { categories: Category[] }) {
  const [featured, latest] = await Promise.all([
    getFeaturedProducts(10),
    getLatestProducts(10, true),
  ]);

  const topCategories = categories.slice(0, HIGHLIGHTED_CATEGORIES);
  const categorySections = await Promise.all(
    topCategories.map(async (cat) => ({
      category: cat,
      products: await getProductsByCategorySlug(cat.slug, 10),
    }))
  );

  return (
    <>
      <HorizontalSection title="Meilleures ventes" products={featured} />
      <HorizontalSection title="Nouveautés" products={latest} />
      {categorySections.map(({ category, products }) => (
        <HorizontalSection
          key={category.id}
          title={category.name}
          href={`/c/${category.slug}`}
          products={products}
        />
      ))}
    </>
  );
}

function ProductSectionsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="flex gap-3 overflow-hidden sm:gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="w-[160px] shrink-0 sm:w-[200px]">
                <div className="aspect-square animate-pulse rounded-xl bg-muted" />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default async function HomePage() {
  const [categories, [heroProduct]] = await Promise.all([
    getCategories(),
    getFeaturedProducts(1),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <h1 className="sr-only">NETEREKA - Électronique &amp; High-Tech en Côte d&apos;Ivoire</h1>
      {heroProduct && <HeroBanner product={heroProduct} />}

      <CategoryNav categories={categories} />

      <Suspense fallback={<ProductSectionsSkeleton />}>
        <ProductSections categories={categories} />
      </Suspense>

      <TrustBadges />
    </div>
  );
}
