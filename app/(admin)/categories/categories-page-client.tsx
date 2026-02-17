"use client";

import { useState } from "react";
import { CategoryTable } from "@/components/admin/category-table";
import { CategoryCardMobile } from "@/components/admin/category-card-mobile";
import { CategoryForm } from "@/components/admin/category-form";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { CategoryCreateButton } from "./category-create-button";
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import type { Category } from "@/lib/db/types";

interface CategoriesPageClientProps {
  categories: CategoryWithCount[];
  allCategories: Category[];
}

export function CategoriesPageClient({ categories, allCategories }: CategoriesPageClientProps) {
  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(null);

  return (
    <>
      {/* Mobile toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <ViewSwitcher />
          <span className="text-sm text-muted-foreground">
            {categories.length} catégorie(s)
          </span>
        </div>
        <CategoryCreateButton categories={allCategories} />
      </div>

      {/* Responsive data list */}
      <ResponsiveDataList
        data={categories}
        renderTable={(data) => <CategoryTable categories={data} allCategories={allCategories} />}
        renderCard={(category) => (
          <CategoryCardMobile
            category={category}
            onEdit={(cat) => setEditCategory(cat)}
          />
        )}
        emptyMessage="Aucune catégorie"
      />

      {/* Edit form dialog */}
      <CategoryForm
        key={editCategory?.id}
        category={editCategory}
        categories={allCategories}
        open={!!editCategory}
        onOpenChange={(open) => {
          if (!open) setEditCategory(null);
        }}
      />
    </>
  );
}
