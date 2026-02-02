import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { ProductTable } from "@/components/admin/product-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminProducts, getAdminProductCount } from "@/lib/db/admin/products";
import { getAllCategories } from "@/lib/db/admin/categories";

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

  return (
    <div>
      <AdminHeader title="Produits" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex flex-1 flex-wrap items-center gap-3">
          <Input
            name="search"
            placeholder="Rechercher..."
            defaultValue={params.search ?? ""}
            className="w-full sm:w-64"
          />
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Toutes catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={params.status ?? "all"}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Tous statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Filtrer
          </Button>
        </form>
        <Button asChild>
          <Link href="/products/new">Nouveau produit</Link>
        </Button>
      </div>

      <ProductTable products={products} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalCount} produit(s) — Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
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
              <Button variant="outline" size="sm" asChild>
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
