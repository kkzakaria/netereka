import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getCategoryBySlug,
  getCategoryChildren,
  getCategoryAncestors,
  getCategoryDescendantIds,
  getCategoryTree,
} from "@/lib/db/categories";
import {
  searchProducts,
  countSearchResults,
  getBrandsInCategory,
  getPriceRangeInCategory,
} from "@/lib/db/search";
import type { SearchOptions } from "@/lib/db/types";
import { ProductGrid } from "@/components/storefront/product-grid";
import { FilterProvider } from "@/app/(storefront)/search/filter-context";
import { SearchFilters } from "@/app/(storefront)/search/search-filters";
import { SearchSort } from "@/app/(storefront)/search/search-sort";
import { ActiveFilters } from "@/app/(storefront)/search/active-filters";
import { MobileFilterSheet } from "@/app/(storefront)/search/mobile-filter-sheet";
import { LoadMoreButton } from "./load-more-button";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

export const revalidate = 300;

const getCategoryCached = cache(getCategoryBySlug);

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    brand?: string;
    min_price?: string;
    max_price?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { sort } = await searchParams;
  const category = await getCategoryCached(slug);
  if (!category) return {};

  const description =
    category.description ??
    `Découvrez notre sélection de ${category.name} en Côte d'Ivoire. Livraison rapide à Abidjan. Paiement à la livraison.`;

  return {
    title: `${category.name} - Acheter en Côte d'Ivoire`,
    description,
    openGraph: {
      title: `${category.name} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/c/${slug}`,
      siteName: SITE_NAME,
      locale: "fr_CI",
      type: "website",
    },
    alternates: {
      canonical: `/c/${slug}`,
    },
    ...(sort && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryCached(slug);
  if (!category) notFound();

  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 20;

  // Fetch subcategories, ancestors, descendant IDs, and category tree in parallel
  const [children, ancestors, descendantIds, categoryTree] = await Promise.all([
    getCategoryChildren(category.id),
    getCategoryAncestors(category.id),
    getCategoryDescendantIds(category.id),
    getCategoryTree(),
  ]);

  // Aggregate category IDs: current + all descendants
  const allCategoryIds = [category.id, ...descendantIds];

  const opts: SearchOptions = {
    categoryIds: allCategoryIds,
    brands: sp.brand ? sp.brand.split(",").filter(Boolean) : undefined,
    minPrice: sp.min_price ? parseInt(sp.min_price, 10) : undefined,
    maxPrice: sp.max_price ? parseInt(sp.max_price, 10) : undefined,
    sort: (sp.sort as SearchOptions["sort"]) || "relevance",
    limit,
    offset: (currentPage - 1) * limit,
  };

  const [products, total, brands, priceRange] = await Promise.all([
    searchProducts(opts),
    countSearchResults(opts),
    getBrandsInCategory(allCategoryIds),
    getPriceRangeInCategory(allCategoryIds),
  ]);

  const hasMore = (currentPage - 1) * limit + products.length < total;

  // Build breadcrumb chain: Accueil > ...ancestors > current
  const breadcrumbItems = [
    { name: "Accueil", href: "/" },
    ...ancestors.map((a) => ({ name: a.name, href: `/c/${a.slug}` })),
    { name: category.name },
  ];

  return (
    <FilterProvider
      categoryTree={categoryTree}
      activeCategorySlug={slug}
      brands={brands}
      priceRange={priceRange}
      basePath={`/c/${slug}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-6">
        <BreadcrumbSchema items={breadcrumbItems} />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: category.name,
            description:
              category.description ??
              `Découvrez notre sélection de ${category.name} en Côte d'Ivoire.`,
            url: `${SITE_URL}/c/${slug}`,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            numberOfItems: total,
          }}
        />

        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          {ancestors.map((a) => (
            <span key={a.id}>
              <span className="mx-1.5">/</span>
              <Link href={`/c/${a.slug}`} className="hover:text-foreground">
                {a.name}
              </Link>
            </span>
          ))}
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{category.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {category.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {total} produit{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Subcategories grid */}
        {children.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/c/${child.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-muted/50"
              >
                {child.image_url && (
                  <img
                    src={child.image_url}
                    alt={child.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <span className="text-sm font-medium">{child.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Active filters + sort */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <ActiveFilters />
            <MobileFilterSheet />
          </div>
          <SearchSort />
        </div>

        {/* Main layout */}
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-24">
              <SearchFilters />
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 flex-1">
            <ProductGrid products={products} />

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <LoadMoreButton slug={slug} nextPage={currentPage + 1} />
              </div>
            )}
          </div>
        </div>
      </div>
    </FilterProvider>
  );
}
