"use client";

import { useRef, useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/db/types";
import { createCategory, updateCategory } from "@/actions/admin/categories";

interface CategoryFormProps {
  category?: Category | null;
  categories?: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getDescendantIds(categoryId: string, allCategories: Category[]): Set<string> {
  const ids = new Set<string>();
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const cat of allCategories) {
      if (cat.parent_id === current && !ids.has(cat.id)) {
        ids.add(cat.id);
        queue.push(cat.id);
      }
    }
  }
  return ids;
}

export function CategoryForm({
  category,
  categories = [],
  open,
  onOpenChange,
}: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!category;
  const isActiveRef = useRef<HTMLInputElement>(null);
  const parentIdRef = useRef<HTMLInputElement>(null);
  const [parentId, setParentId] = useState(category?.parent_id ?? "");

  // Filter out current category and its descendants from parent options
  const excludeIds = isEdit
    ? new Set([category!.id, ...getDescendantIds(category!.id, categories)])
    : new Set<string>();

  const parentOptions = categories.filter((c) => !excludeIds.has(c.id));

  // Build indentation for parent options
  function getIndent(cat: Category): string {
    if (!cat.parent_id) return "";
    const parent = categories.find((c) => c.id === cat.parent_id);
    if (!parent || !parent.parent_id) return "\u00A0\u00A0\u00A0\u00A0";
    return "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(category!.id, formData)
        : await createCategory(formData);

      if (result.success) {
        toast.success(isEdit ? "Catégorie mise à jour" : "Catégorie créée");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Nom</Label>
            <Input
              id="c-name"
              name="name"
              required
              defaultValue={category?.name ?? ""}
              placeholder="Ex: Smartphones"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-slug">Slug</Label>
            <Input
              id="c-slug"
              name="slug"
              defaultValue={category?.slug ?? ""}
              placeholder="Auto-généré si vide"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-description">Description</Label>
            <Input
              id="c-description"
              name="description"
              defaultValue={category?.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Catégorie parente</Label>
            <input type="hidden" name="parent_id" ref={parentIdRef} value={parentId} />
            <Select
              value={parentId || "__none__"}
              onValueChange={(value) => {
                const newVal = value === "__none__" ? "" : value;
                setParentId(newVal);
                if (parentIdRef.current) parentIdRef.current.value = newVal;
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune (catégorie principale)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune (catégorie principale)</SelectItem>
                {parentOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {getIndent(cat)}{cat.parent_id ? "↳ " : ""}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-sort">Ordre d&apos;affichage</Label>
            <Input
              id="c-sort"
              name="sort_order"
              type="number"
              min={0}
              defaultValue={category?.sort_order ?? 0}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <input
              type="hidden"
              name="is_active"
              ref={isActiveRef}
              defaultValue={category?.is_active ?? 1}
            />
            <Switch
              defaultChecked={category ? category.is_active === 1 : true}
              onCheckedChange={(checked) => {
                if (isActiveRef.current) isActiveRef.current.value = checked ? "1" : "0";
              }}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Enregistrement..."
              : isEdit
                ? "Mettre à jour"
                : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
