"use client";

import { useRef, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CategoryWithCount } from "@/lib/db/admin/categories";

export type CategoryOption = Pick<CategoryWithCount, "id" | "name" | "depth" | "parent_id">;

interface ComboSelectProps {
  items: CategoryOption[];
  value: string;
  onValueChange: (id: string) => void;
  placeholder: string;
  id?: string;
}

function ComboSelect({ items, value, onValueChange, placeholder, id }: ComboSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName = items.find((c) => c.id === value)?.name ?? "";
  const displayValue = open ? search : selectedName;

  const filtered = useMemo(
    () =>
      search
        ? items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : items,
    [items, search],
  );

  function handleFocus() {
    setSearch("");
    setOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setOpen(true);
  }

  function handleSelect(id: string) {
    onValueChange(id);
    setSearch("");
    setOpen(false);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setSearch("");
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <Input
        id={id}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Aucun résultat
              </p>
            ) : (
              filtered.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="option"
                  aria-selected={value === cat.id}
                  className={cn(
                    "flex w-full cursor-default items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === cat.id && "bg-accent/50 font-medium",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(cat.id)}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const effectiveCategoryId = subcategoryId || parentId;

  function handleParentChange(id: string) {
    setParentId(id);
    setSubcategoryId("");
  }

  return (
    <div className={`grid gap-3 ${hasSubcategories ? "sm:grid-cols-2" : "grid-cols-1"}`}>
      <input type="hidden" name="category_id" value={effectiveCategoryId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-parent">
          Catégorie <span className="text-destructive">*</span>
        </Label>
        <ComboSelect
          id="cat-parent"
          items={roots}
          value={parentId}
          onValueChange={handleParentChange}
          placeholder="Rechercher une catégorie…"
        />
      </div>

      {hasSubcategories && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="cat-sub">Sous-catégorie</Label>
          <ComboSelect
            id="cat-sub"
            items={subcategories}
            value={subcategoryId}
            onValueChange={setSubcategoryId}
            placeholder="Rechercher…"
          />
        </div>
      )}
    </div>
  );
}
