export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getTopLevelCategories } from "@/lib/db/categories";
import {
  getFeaturedProducts,
  getLatestProducts,
  getProductsByCategorySlug,
  toProductCardData,
} from "@/lib/db/products";
import type { Banner } from "@/lib/db/types";
import { getActiveBanners } from "@/lib/db/storefront/banners";
import { CategoryNav } from "@/components/storefront/category-nav";
import { HeroBanner } from "@/components/storefront/hero-banner";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { TrustBadges } from "@/components/storefront/trust-badges";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HIGHLIGHTED_CATEGORIES = 3;
// Cards rendered per horizontal section. Kept intentionally low to limit the
// initial DOM / hydration cost on mobile (each card mounts a client island),
// which is the main lever on homepage LCP. Sections are scrollable carousels
// with a "Voir tout" link, so fewer initial cards has minimal UX impact.
const PRODUCTS_PER_SECTION = 8;

export default async function HomePage() {
  // Start categories early — category sections depend on it
  const categoriesPromise = getTopLevelCategories();

  // Start category sections as soon as categories resolve (don't wait for other fetches)
  const categorySectionsPromise = categoriesPromise.then((cats) =>
    Promise.all(
      cats.slice(0, HIGHLIGHTED_CATEGORIES).map(async (cat) => ({
        category: cat,
        products: (await getProductsByCategorySlug(cat.slug, PRODUCTS_PER_SECTION)).map(toProductCardData),
      }))
    )
  );

  // Run all independent fetches in parallel
  const [categories, featured, latest, activeBanners, categorySections] =
    await Promise.all([
      categoriesPromise,
      getFeaturedProducts(PRODUCTS_PER_SECTION),
      getLatestProducts(PRODUCTS_PER_SECTION, true),
      getActiveBanners().catch((error) => {
        console.error("[homepage] Failed to fetch active banners:", error);
        return [] as Banner[];
      }),
      categorySectionsPromise,
    ]);

  const featuredCards = featured.map(toProductCardData);
  const latestCards = latest.map(toProductCardData);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <h1 className="sr-only">NETEREKA - Électronique &amp; High-Tech en Côte d&apos;Ivoire</h1>
      <HeroBanner banners={activeBanners} fallbackProducts={featuredCards.slice(0, 3)} />

      <CategoryNav categories={categories} />

      <HorizontalSection
        title="Meilleures ventes"
        products={featuredCards}
      />

      <HorizontalSection
        title="Nouveautés"
        products={latestCards}
      />

      {categorySections.map(({ category, products }) => (
        <HorizontalSection
          key={category.id}
          title={category.name}
          href={`/c/${category.slug}`}
          products={products}
        />
      ))}

      <TrustBadges />
    </div>
  );
}
