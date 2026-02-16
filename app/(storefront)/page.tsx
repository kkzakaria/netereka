export const dynamic = "force-dynamic";

import type { Metadata } from "next";
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

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HIGHLIGHTED_CATEGORIES = 3;

export default async function HomePage() {
  const [categories, featured, latest] = await Promise.all([
    getCategories(),
    getFeaturedProducts(10),
    getLatestProducts(10, true),
  ]);

  // Dynamically fetch products for the first N categories
  const topCategories = categories.slice(0, HIGHLIGHTED_CATEGORIES);
  const categorySections = await Promise.all(
    topCategories.map(async (cat) => ({
      category: cat,
      products: await getProductsByCategorySlug(cat.slug, 10),
    }))
  );

  const heroProduct = featured[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <h1 className="sr-only">NETEREKA - Électronique &amp; High-Tech en Côte d&apos;Ivoire</h1>
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
