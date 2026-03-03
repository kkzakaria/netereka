export const dynamic = "force-dynamic";

import { Suspense } from "react";
import type { Metadata } from "next";
import { getTopLevelCategories } from "@/lib/db/categories";
import {
  getFeaturedProducts,
  getLatestProducts,
  getProductsByCategorySlug,
  toProductCardData,
} from "@/lib/db/products";
import type { Banner, Category } from "@/lib/db/types";
import { getActiveBanners } from "@/lib/db/storefront/banners";
import { CategoryNav } from "@/components/storefront/category-nav";
import { HeroBanner } from "@/components/storefront/hero-banner";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { TrustBadges } from "@/components/storefront/trust-badges";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HIGHLIGHTED_CATEGORIES = 3;

export default async function HomePage() {
  // Only await above-fold critical data — resolves fast (~100ms)
  // Product sections use separate Suspense boundaries and stream in independently
  const [activeBanners, categories] = await Promise.all([
    getActiveBanners().catch((error) => {
      console.error("[homepage] Failed to fetch active banners:", error);
      return [] as Banner[];
    }),
    getTopLevelCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <h1 className="sr-only">NETEREKA - Électronique &amp; High-Tech en Côte d&apos;Ivoire</h1>
      <HeroBanner banners={activeBanners} fallbackProducts={[]} />

      <CategoryNav categories={categories} />

      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <LatestSection />
      </Suspense>

      {categories.slice(0, HIGHLIGHTED_CATEGORIES).map((cat) => (
        <Suspense key={cat.id} fallback={<SectionSkeleton />}>
          <CategorySection category={cat} />
        </Suspense>
      ))}

      <TrustBadges />
    </div>
  );
}

async function FeaturedSection() {
  const products = (await getFeaturedProducts(10)).map(toProductCardData);
  return <HorizontalSection title="Meilleures ventes" products={products} />;
}

async function LatestSection() {
  const products = (await getLatestProducts(10, true)).map(toProductCardData);
  return <HorizontalSection title="Nouveautés" products={products} />;
}

async function CategorySection({ category }: { category: Category }) {
  const products = (await getProductsByCategorySlug(category.slug, 10)).map(toProductCardData);
  return (
    <HorizontalSection title={category.name} href={`/c/${category.slug}`} products={products} />
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
      <div className="flex gap-3 overflow-hidden sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-52 w-[160px] shrink-0 animate-pulse rounded-xl bg-muted sm:w-[200px]" />
        ))}
      </div>
    </div>
  );
}
