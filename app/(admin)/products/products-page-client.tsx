"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/admin/product-table";
import { ProductCardMobile } from "@/components/admin/product-card-mobile";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { AdminMobileFilterSheet } from "@/components/admin/mobile-filter-sheet";
import { ViewSwitcher } from "@/components/admin/view-switcher";

interface ProductData {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category_name?: string | null;
  base_price: number;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  image_url?: string | null;
}

interface ProductsPageClientProps {
  products: ProductData[];
  categories: { id: string; name: string }[];
  totalCount: number;
}

export function ProductsPageClient({
  products,
  categories,
  totalCount,
}: ProductsPageClientProps) {
  return (
    <>
      {/* Mobile toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <AdminMobileFilterSheet categories={categories} basePath="/products" />
          <ViewSwitcher />
        </div>
        <Button asChild size="sm">
          <Link href="/products/new">Nouveau</Link>
        </Button>
      </div>

      {/* Product count (mobile) */}
      <p className="mb-3 text-sm text-muted-foreground lg:hidden">
        {totalCount} produit(s)
      </p>

      {/* Responsive data list */}
      <ResponsiveDataList
        data={products}
        renderTable={(data) => <ProductTable products={data} />}
        renderCard={(product) => <ProductCardMobile product={product} />}
        emptyMessage="Aucun produit trouvé"
      />
    </>
  );
}
