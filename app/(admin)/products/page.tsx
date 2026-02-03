import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductFilters } from "@/components/admin/product-filters";
import { getAdminProducts, getAdminProductCount } from "@/lib/db/admin/products";
import { getAllCategories } from "@/lib/db/admin/categories";
import { ProductsPageClient } from "./products-page-client";

interface Props {
  searchParams: Promise<{
    search?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = {
    search: params.search,
    categoryId: params.category,
    status: (params.status as "active" | "inactive" | "all") || "all",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [products, totalCount, categories] = await Promise.all([
    getAdminProducts(filters),
    getAdminProductCount(filters),
    getAllCategories(),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const productData = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    category_name: p.category_name,
    base_price: p.base_price,
    stock_quantity: p.stock_quantity,
    is_active: p.is_active,
    is_featured: p.is_featured,
    image_url: p.image_url,
  }));

  // Find active category name for filter chip
  const activeCategory = params.category
    ? categories.find((c) => c.id === params.category)
    : null;

  return (
    <div>
      <AdminHeader title="Produits" />

      {/* Desktop filters - instant filtering */}
      <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
        <ProductFilters
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          className="flex-1"
        />
        <Button asChild>
          <Link href="/products/new">Nouveau produit</Link>
        </Button>
      </div>

      {/* Mobile header with filter sheet and view switcher */}
      <ProductsPageClient
        products={productData}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        totalCount={totalCount}
      />

      {/* Active filter chips (mobile) */}
      {(params.search || params.category || params.status) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
          {params.search && (
            <Badge variant="secondary" className="gap-1">
              Recherche: {params.search}
              <Link
                href={{
                  pathname: "/products",
                  query: { ...params, search: undefined, page: "1" },
                }}
                className="ml-1 hover:text-foreground"
              >
                ×
              </Link>
            </Badge>
          )}
          {activeCategory && (
            <Badge variant="secondary" className="gap-1">
              {activeCategory.name}
              <Link
                href={{
                  pathname: "/products",
                  query: { ...params, category: undefined, page: "1" },
                }}
                className="ml-1 hover:text-foreground"
              >
                ×
              </Link>
            </Badge>
          )}
          {params.status && params.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {params.status === "active" ? "Actifs" : "Inactifs"}
              <Link
                href={{
                  pathname: "/products",
                  query: { ...params, status: undefined, page: "1" },
                }}
                className="ml-1 hover:text-foreground"
              >
                ×
              </Link>
            </Badge>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>
            {totalCount} produit(s) — Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="touch" asChild className="sm:size-auto sm:h-8 sm:px-3">
                <Link
                  href={{
                    pathname: "/products",
                    query: { ...params, page: String(page - 1) },
                  }}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="touch" asChild className="sm:size-auto sm:h-8 sm:px-3">
                <Link
                  href={{
                    pathname: "/products",
                    query: { ...params, page: String(page + 1) },
                  }}
                >
                  Suivant
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
