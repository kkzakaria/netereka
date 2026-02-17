"use client";

import { useMemo, useState, useCallback } from "react";
import { CategoryTable } from "@/components/admin/category-table";
import { CategoryCardMobile } from "@/components/admin/category-card-mobile";
import { CategoryForm } from "@/components/admin/category-form";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { Button } from "@/components/ui/button";
import { CategoryCreateButton } from "./category-create-button";
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import type { Category } from "@/lib/db/types";

interface CategoriesPageClientProps {
  categories: CategoryWithCount[];
  allCategories: Category[];
}

function getVisibleCategories(
  categories: CategoryWithCount[],
  expandedIds: Set<string>
): CategoryWithCount[] {
  return categories.filter((cat) => {
    // Root categories are always visible
    if (!cat.parent_id) return true;
    // Direct children: visible if parent is expanded
    return expandedIds.has(cat.parent_id);
  });
}

export function CategoriesPageClient({ categories, allCategories }: CategoriesPageClientProps) {
  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build a map of parent_id -> count for O(1) lookups
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) {
      if (cat.parent_id) {
        map.set(cat.parent_id, (map.get(cat.parent_id) ?? 0) + 1);
      }
    }
    return map;
  }, [categories]);

  const childCount = useCallback(
    (id: string) => childCountMap.get(id) ?? 0,
    [childCountMap]
  );

  const hasAnyChildren = childCountMap.size > 0;

  // IDs of all categories that have children (for expand all)
  const parentIds = useMemo(
    () => [...childCountMap.keys()],
    [childCountMap]
  );

  const isAllExpanded = parentIds.length > 0 && parentIds.every((id) => expandedIds.has(id));

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(parentIds));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  const visibleCategories = useMemo(
    () => getVisibleCategories(categories, expandedIds),
    [categories, expandedIds]
  );

  return (
    <>
      {/* Mobile toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <ViewSwitcher />
          <span className="text-sm text-muted-foreground">
            {categories.length} catégorie(s)
          </span>
          {hasAnyChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={isAllExpanded ? collapseAll : expandAll}
            >
              {isAllExpanded ? "Tout réduire" : "Tout développer"}
            </Button>
          )}
        </div>
        <CategoryCreateButton categories={allCategories} />
      </div>

      {/* Desktop expand/collapse toolbar */}
      {hasAnyChildren && (
        <div className="mb-2 hidden lg:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllExpanded ? collapseAll : expandAll}
          >
            {isAllExpanded ? "Tout réduire" : "Tout développer"}
          </Button>
        </div>
      )}

      {/* Responsive data list */}
      <ResponsiveDataList
        data={visibleCategories}
        renderTable={(data) => (
          <CategoryTable
            categories={data}
            allCategories={allCategories}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            childCount={childCount}
          />
        )}
        renderCard={(category) => (
          <CategoryCardMobile
            category={category}
            onEdit={(cat) => setEditCategory(cat)}
            isExpanded={expandedIds.has(category.id)}
            onToggleExpand={toggleExpand}
            childCount={childCount(category.id)}
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
