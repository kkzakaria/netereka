export const dynamic = "force-dynamic";

import { getCategories } from "@/lib/db/categories";
import {
  getFeaturedProducts,
  getLatestProducts,
  getProductsByCategorySlug,
} from "@/lib/db/products";
import { CategoryNav } from "@/components/storefront/category-nav";
import { HeroBanner } from "@/components/storefront/hero-banner";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { TrustBadges } from "@/components/storefront/trust-badges";

export default async function HomePage() {
  const [categories, featured, latest, smartphones, ordinateurs, tablettes] =
    await Promise.all([
      getCategories(),
      getFeaturedProducts(10),
      getLatestProducts(10, true),
      getProductsByCategorySlug("smartphones", 10),
      getProductsByCategorySlug("ordinateurs", 10),
      getProductsByCategorySlug("tablettes", 10),
    ]);

  const heroProduct = featured[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      {heroProduct && <HeroBanner product={heroProduct} />}

      <CategoryNav categories={categories} />

      <HorizontalSection
        title="Meilleures ventes"
        products={featured}
      />

      <HorizontalSection
        title="Nouveautés"
        products={latest}
      />

      <HorizontalSection
        title="Smartphones"
        href="/c/smartphones"
        products={smartphones}
      />

      <HorizontalSection
        title="Ordinateurs"
        href="/c/ordinateurs"
        products={ordinateurs}
      />

      <HorizontalSection
        title="Tablettes"
        href="/c/tablettes"
        products={tablettes}
      />

      <TrustBadges />
    </div>
  );
}
