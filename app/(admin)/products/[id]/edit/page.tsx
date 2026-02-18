import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductFormSections } from "@/components/admin/product-form-sections";
import { getAdminProductById } from "@/lib/db/admin/products";
import { getAllCategories } from "@/lib/db/admin/categories";
import type { CategoryOption } from "@/components/admin/category-cascading-select";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNewParam } = await searchParams;
  const isNew = isNewParam === "1";

  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAllCategories(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour aux produits"
          >
            <Link href="/products">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {isNew ? "Nouveau produit" : product.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? "Créer un produit" : "Modifier le produit"}
            </p>
          </div>
        </header>
      </AdminPageHeader>
      <ProductFormSections
        product={product}
        categories={categories.map((c): CategoryOption => ({
          id: c.id,
          name: c.name,
          depth: c.depth,
          parent_id: c.parent_id,
        }))}
        isNew={isNew}
      />
    </div>
  );
}
