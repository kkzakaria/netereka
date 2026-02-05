import type { Metadata } from "next";
import { searchProducts, countSearchResults, getBrandsInUse, getPriceRange } from "@/lib/db/search";
import { getCategories } from "@/lib/db/categories";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SITE_NAME } from "@/lib/utils/constants";
import type { SearchOptions } from "@/lib/db/types";
import { FilterProvider } from "./filter-context";
import { SearchFilters } from "./search-filters";
import { SearchSort } from "./search-sort";
import { ActiveFilters } from "./active-filters";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { LoadMoreSearch } from "./load-more-search";

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    min_price?: string;
    max_price?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, sort } = await searchParams;
  const title = q ? `Résultats pour "${q}"` : "Tous les produits";
  const description = q
    ? `Trouvez "${q}" sur ${SITE_NAME}. Électronique en Côte d'Ivoire avec livraison rapide à Abidjan.`
    : `Parcourez tout le catalogue ${SITE_NAME}. Smartphones, ordinateurs, consoles et plus en Côte d'Ivoire.`;
  return {
    title,
    description,
    alternates: { canonical: "/search" },
    ...(sort && { robots: { index: false, follow: true } }),
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 20;

  const opts: SearchOptions = {
    query: sp.q || undefined,
    category: sp.category || undefined,
    brands: sp.brand ? sp.brand.split(",").filter(Boolean) : undefined,
    minPrice: sp.min_price ? parseInt(sp.min_price, 10) : undefined,
    maxPrice: sp.max_price ? parseInt(sp.max_price, 10) : undefined,
    sort: (sp.sort as SearchOptions["sort"]) || "relevance",
    limit,
    offset: (currentPage - 1) * limit,
  };

  const [products, total, brands, categories, priceRange] = await Promise.all([
    searchProducts(opts),
    countSearchResults(opts),
    getBrandsInUse(),
    getCategories(),
    getPriceRange(),
  ]);

  const hasMore = (currentPage - 1) * limit + products.length < total;

  return (
    <FilterProvider categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} brands={brands} priceRange={priceRange}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {sp.q ? `Résultats pour "${sp.q}"` : "Tous les produits"}
          </h1>
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
                <LoadMoreSearch nextPage={currentPage + 1} />
              </div>
            )}
          </div>
        </div>
      </div>
    </FilterProvider>
  );
}
