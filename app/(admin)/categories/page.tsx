import { AdminHeader } from "@/components/admin/admin-header";
import { CategoryTable } from "@/components/admin/category-table";
import { CategoryCreateButton } from "./category-create-button";
import { getAllCategories } from "@/lib/db/admin/categories";

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div>
      <AdminHeader title="Catégories" />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} catégorie(s)
        </p>
        <CategoryCreateButton />
      </div>
      <CategoryTable categories={categories} />
    </div>
  );
}
