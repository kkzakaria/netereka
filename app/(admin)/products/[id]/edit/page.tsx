import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
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
      <AdminHeader title={`Modifier: ${product.name}`} />
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
