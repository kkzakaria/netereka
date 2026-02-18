"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryWithCount } from "@/lib/db/admin/categories";

export type CategoryOption = Pick<CategoryWithCount, "id" | "name" | "depth" | "parent_id">;

interface CategoryCascadingSelectProps {
  categories: CategoryOption[];
  defaultCategoryId?: string;
}

export function CategoryCascadingSelect({
  categories,
  defaultCategoryId,
}: CategoryCascadingSelectProps) {
  const { roots, childrenByParent } = useMemo(() => {
    const r = categories.filter((c) => c.depth === 0);
    const map = new Map<string, CategoryOption[]>();
    for (const cat of categories) {
      if (cat.parent_id) {
        const existing = map.get(cat.parent_id) ?? [];
        existing.push(cat);
        map.set(cat.parent_id, existing);
      }
    }
    return { roots: r, childrenByParent: map };
  }, [categories]);

  // Determine initial state from defaultCategoryId
  let initialParentId = "";
  let initialSubcategoryId = "";
  if (defaultCategoryId) {
    const cat = categories.find((c) => c.id === defaultCategoryId);
    if (cat) {
      if (cat.depth === 0) {
        initialParentId = cat.id;
      } else if (cat.parent_id) {
        initialParentId = cat.parent_id;
        initialSubcategoryId = cat.id;
      }
    }
  }

  const [parentId, setParentId] = useState(initialParentId);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId);

  const subcategories = parentId ? (childrenByParent.get(parentId) ?? []) : [];
  const hasSubcategories = subcategories.length > 0;

  // Submit subcategory if selected, otherwise fall back to parent
  const effectiveCategoryId = subcategoryId || parentId;

  function handleParentChange(value: string) {
    setParentId(value);
    setSubcategoryId(""); // Reset subcategory when parent changes
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="category_id" value={effectiveCategoryId} />

      <div className="space-y-2">
        <Label htmlFor="parent-category">Catégorie</Label>
        <Select value={parentId || undefined} onValueChange={handleParentChange}>
          <SelectTrigger id="parent-category">
            <SelectValue placeholder="Choisir une catégorie…" />
          </SelectTrigger>
          <SelectContent>
            {roots.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasSubcategories && (
        <div className="space-y-2">
          <Label htmlFor="subcategory">Sous-catégorie</Label>
          <Select
            value={subcategoryId || undefined}
            onValueChange={setSubcategoryId}
          >
            <SelectTrigger id="subcategory">
              <SelectValue placeholder="Choisir une sous-catégorie…" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
