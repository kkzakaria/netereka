"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductVariant } from "@/lib/db/types";
import { createVariant, updateVariant } from "@/actions/admin/variants";

interface VariantFormProps {
  productId: string;
  variant?: ProductVariant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VariantForm({
  productId,
  variant,
  open,
  onOpenChange,
}: VariantFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!variant;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateVariant(variant!.id, productId, formData)
        : await createVariant(productId, formData);

      if (result.success) {
        toast.success(isEdit ? "Variante mise à jour" : "Variante créée");
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
            {isEdit ? "Modifier la variante" : "Ajouter une variante"}
          </DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="v-name">Nom</Label>
            <Input
              id="v-name"
              name="name"
              required
              defaultValue={variant?.name ?? ""}
              placeholder="Ex: 256 Go - Bleu"
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="v-sku">SKU</Label>
              <Input
                id="v-sku"
                name="sku"
                defaultValue={variant?.sku ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-sort">Ordre</Label>
              <Input
                id="v-sort"
                name="sort_order"
                type="number"
                min={0}
                defaultValue={variant?.sort_order ?? 0}
              />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="v-price">Prix (FCFA)</Label>
              <Input
                id="v-price"
                name="price"
                type="number"
                min={0}
                required
                defaultValue={variant?.price ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-compare">Ancien prix</Label>
              <Input
                id="v-compare"
                name="compare_price"
                type="number"
                min={0}
                defaultValue={variant?.compare_price ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-stock">Stock</Label>
            <Input
              id="v-stock"
              name="stock_quantity"
              type="number"
              min={0}
              defaultValue={variant?.stock_quantity ?? 0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-attributes">
              Attributs (JSON)
            </Label>
            <Input
              id="v-attributes"
              name="attributes"
              defaultValue={variant?.attributes ?? "{}"}
              placeholder='{"color":"Bleu","storage":"256 Go"}'
            />
          </div>
          <input type="hidden" name="is_active" value={variant?.is_active ?? 1} />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
