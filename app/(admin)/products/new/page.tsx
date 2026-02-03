import { AdminHeader } from "@/components/admin/admin-header";
import { ProductForm } from "@/components/admin/product-form";
import { getAllCategories } from "@/lib/db/admin/categories";

export default async function NewProductPage() {
  const categories = await getAllCategories();

  return (
    <div>
      <AdminHeader title="Nouveau produit" />
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
