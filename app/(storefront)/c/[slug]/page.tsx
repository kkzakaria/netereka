import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/db/categories";
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
import { SITE_NAME } from "@/lib/utils/constants";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryCached(slug);
  if (!category) return {};
  return {
    title: `${category.name} | ${SITE_NAME}`,
    description: category.description ?? `Découvrez notre sélection de ${category.name}`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryCached(slug);
  if (!category) notFound();

  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 20;

  const opts: SearchOptions = {
    category: slug,
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
    getBrandsInCategory(category.id),
    getPriceRangeInCategory(category.id),
  ]);

  const hasMore = (currentPage - 1) * limit + products.length < total;

  return (
    <FilterProvider
      categories={[]}
      brands={brands}
      priceRange={priceRange}
      basePath={`/c/${slug}`}
      hideCategory
    >
      <div className="mx-auto max-w-7xl px-4 py-6">
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
