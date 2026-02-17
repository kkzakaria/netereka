import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryCreateButton } from "./category-create-button";
import { getAllCategories } from "@/lib/db/admin/categories";
import { getCategories } from "@/lib/db/categories";
import { CategoriesPageClient } from "./categories-page-client";

export default async function CategoriesPage() {
  const [categories, allCategories] = await Promise.all([
    getAllCategories(),
    getCategories(),
  ]);

  return (
    <div>
      <AdminPageHeader className="space-y-4">
        <AdminHeader title="Catégories" />
        {/* Desktop header */}
        <div className="hidden items-center justify-between lg:flex">
          <p className="text-sm text-muted-foreground">
            {categories.length} catégorie(s)
          </p>
          <CategoryCreateButton categories={allCategories} />
        </div>
      </AdminPageHeader>

      {/* Mobile/responsive content */}
      <CategoriesPageClient categories={categories} allCategories={allCategories} />
    </div>
  );
}
