"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export interface CategoryOption {
  id: string;
  name: string;
  depth: number;
  parent_id: string | null;
}

interface CategoryCascadingSelectProps {
  categories: CategoryOption[];
  defaultCategoryId?: string;
}

export function CategoryCascadingSelect({
  categories,
  defaultCategoryId,
}: CategoryCascadingSelectProps) {
  const roots = categories.filter((c) => c.depth === 0);
  const childrenByParent = new Map<string, CategoryOption[]>();
  for (const cat of categories) {
    if (cat.parent_id) {
      const existing = childrenByParent.get(cat.parent_id) ?? [];
      existing.push(cat);
      childrenByParent.set(cat.parent_id, existing);
    }
  }

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

  // The actual category_id submitted is the subcategory if selected, otherwise the parent
  const effectiveCategoryId = hasSubcategories
    ? subcategoryId || ""
    : parentId;

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
