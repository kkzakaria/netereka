import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/product-form";
import { getAllCategories } from "@/lib/db/admin/categories";

export default async function NewProductPage() {
  const categories = await getAllCategories();

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
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
          <h1 className="text-lg font-bold sm:text-2xl">Nouveau produit</h1>
          <p className="text-sm text-muted-foreground">Créer un produit</p>
        </div>
      </header>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
