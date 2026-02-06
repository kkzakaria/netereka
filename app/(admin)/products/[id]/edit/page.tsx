import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { VariantList } from "@/components/admin/variant-list";
import { ImageManager } from "@/components/admin/image-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminProductById } from "@/lib/db/admin/products";
import { getAllCategories } from "@/lib/db/admin/categories";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
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
            <h1 className="truncate text-lg font-bold sm:text-2xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground">Modifier le produit</p>
          </div>
        </header>
      </AdminPageHeader>
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="variants">
            Variantes ({product.variants.length})
          </TabsTrigger>
          <TabsTrigger value="images">
            Images ({product.images.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <ProductForm product={product} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </TabsContent>
        <TabsContent value="variants">
          <VariantList productId={product.id} variants={product.variants} />
        </TabsContent>
        <TabsContent value="images">
          <ImageManager productId={product.id} images={product.images} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
