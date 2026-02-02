"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryForm({
  category,
  open,
  onOpenChange,
}: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!category;
  const isActiveRef = useRef<HTMLInputElement>(null);

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
