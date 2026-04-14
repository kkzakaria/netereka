// components/admin/product-wizard/step-variants.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AttributeEditor } from "@/components/admin/attribute-editor";
import { formatPrice } from "@/lib/utils";
import { createVariant, updateVariant, deleteVariant } from "@/actions/admin/variants";
import type { ProductDetail, ProductVariant } from "@/lib/db/types";

interface StepVariantsProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
}

export function StepVariants({ product, formRef }: StepVariantsProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Filter out color-only variants (created at step 3) — they only have a "color" attribute
  const variants = product.variants.filter((v) => {
    try {
      const attrs = JSON.parse(v.attributes);
      const keys = Object.keys(attrs);
      return keys.length !== 1 || keys[0] !== "color";
    } catch {
      return true;
    }
  });

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createVariant(product.id, formData);
      if (result.success) {
        toast.success("Variante créée");
        setShowCreate(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleUpdate(variantId: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateVariant(variantId, product.id, formData);
      if (result.success) {
        toast.success("Variante mise à jour");
        setEditingId(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(variantId: string) {
    startTransition(async () => {
      const result = await deleteVariant(variantId, product.id);
      if (result.success) {
        toast.success("Variante supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="5" />

      <div>
        <h3 className="text-sm font-semibold">Variantes</h3>
        <p className="text-xs text-muted-foreground">
          Ajoutez des variantes si ce produit existe en plusieurs versions (stockage, RAM…).
        </p>
      </div>

      {/* Existing variants */}
      {variants.length > 0 && (
        <div className="space-y-3">
          {variants.map((v) =>
            editingId === v.id ? (
              <InlineVariantForm
                key={v.id}
                variant={v}
                isPending={isPending}
                onSubmit={(fd) => handleUpdate(v.id, fd)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <VariantCard
                key={v.id}
                variant={v}
                isPending={isPending}
                onEdit={() => setEditingId(v.id)}
                onDelete={() => handleDelete(v.id)}
              />
            ),
          )}
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <InlineVariantForm
          isPending={isPending}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setShowCreate(true)}
        >
          + Ajouter une variante
        </Button>
      )}

      {!showCreate && variants.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune variante. Les variantes couleur sont gérées automatiquement via les étapes
          précédentes.
        </div>
      )}
    </form>
  );
}

/* ── Variant card (read mode) ──────────────────────────────────── */

function VariantCard({
  variant,
  isPending,
  onEdit,
  onDelete,
}: {
  variant: ProductVariant;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  let attrsDisplay: string[] = [];
  try {
    const attrs = JSON.parse(variant.attributes);
    attrsDisplay = Object.entries(attrs)
      .filter(([k]) => k !== "color")
      .map(([k, v]) => `${k}: ${v}`);
  } catch { /* ignore */ }

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{variant.name}</span>
          {variant.sku && (
            <span className="text-xs text-muted-foreground">SKU: {variant.sku}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatPrice(variant.price)}</span>
          <Badge
            variant={variant.stock_quantity <= 5 ? "destructive" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            Stock: {variant.stock_quantity}
          </Badge>
          {attrsDisplay.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          disabled={isPending}
          onClick={onEdit}
        >
          Modifier
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </div>
    </div>
  );
}

/* ── Inline variant form (create / edit) ───────────────────────── */

function InlineVariantForm({
  variant,
  isPending,
  onSubmit,
  onCancel,
}: {
  variant?: ProductVariant;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const isEdit = !!variant;
  const containerRef = useRef<HTMLDivElement>(null);

  function handleSubmit() {
    if (!containerRef.current) return;
    const inputs = containerRef.current.querySelectorAll("input[name], select[name]");
    const formData = new FormData();
    inputs.forEach((el) => {
      const input = el as HTMLInputElement;
      formData.set(input.name, input.value);
    });
    onSubmit(formData);
  }

  return (
    <div ref={containerRef} className="rounded-lg border bg-muted/30 p-4 space-y-4">
      <h4 className="text-sm font-medium">
        {isEdit ? "Modifier la variante" : "Nouvelle variante"}
      </h4>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="iv-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="iv-name"
              name="name"
              required
              defaultValue={variant?.name ?? ""}
              placeholder="Ex: 256 Go"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-sku">SKU</Label>
            <Input
              id="iv-sku"
              name="sku"
              defaultValue={variant?.sku ?? ""}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="iv-price">
              Prix (FCFA) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="iv-price"
              name="price"
              type="number"
              min={0}
              required
              defaultValue={variant?.price ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-compare">Ancien prix</Label>
            <Input
              id="iv-compare"
              name="compare_price"
              type="number"
              min={0}
              defaultValue={variant?.compare_price ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iv-stock">Stock</Label>
            <Input
              id="iv-stock"
              name="stock_quantity"
              type="number"
              min={0}
              defaultValue={variant?.stock_quantity ?? 0}
            />
          </div>
        </div>

        <AttributeEditor defaultValue={variant?.attributes} />

        <input type="hidden" name="is_active" value={variant?.is_active ?? 1} />
        <input type="hidden" name="sort_order" value={variant?.sort_order ?? 0} />

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" size="sm" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Ajouter"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={onCancel}
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
