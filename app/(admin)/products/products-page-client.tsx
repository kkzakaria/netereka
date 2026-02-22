"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/admin/product-table";
import { ProductCardMobile } from "@/components/admin/product-card-mobile";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { AdminMobileFilterSheet } from "@/components/admin/mobile-filter-sheet";
import { ViewSwitcher } from "@/components/admin/view-switcher";

const AiCreateProductModal = dynamic(
  () =>
    import("@/components/admin/ai-create-product-modal").then(
      (m) => m.AiCreateProductModal
    ),
  { ssr: false }
);

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
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <>
      <AiCreateProductModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        categories={categories}
      />

      {/* Mobile toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <AdminMobileFilterSheet categories={categories} basePath="/products" />
          <ViewSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="gap-1.5"
          >
            <span>✨</span>
            <span>IA</span>
          </Button>
          <Button asChild size="sm">
            <Link href="/products/new">Nouveau</Link>
          </Button>
        </div>
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

interface ProductsPageActionsProps {
  categories: { id: string; name: string }[];
}

export function ProductsPageActions({ categories }: ProductsPageActionsProps) {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <>
      <AiCreateProductModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        categories={categories}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setAiModalOpen(true)}
          className="gap-2"
        >
          <span>✨</span>
          Créer avec l&apos;IA
        </Button>
        <Button asChild>
          <Link href="/products/new">Nouveau produit</Link>
        </Button>
      </div>
    </>
  );
}
