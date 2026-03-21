// components/admin/product-wizard/step-identity.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryCascadingSelect, type CategoryOption } from "@/components/admin/category-cascading-select";
import type { ProductDetail } from "@/lib/db/types";

interface StepIdentityProps {
  product: ProductDetail;
  categories: CategoryOption[];
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

export function StepIdentity({
  product,
  categories,
  formRef,
  isPending,
}: StepIdentityProps) {
  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="1" />

      {/* Nom du produit */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="wiz-name">
            Nom du produit <span className="text-destructive">*</span>
          </Label>
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
            title="Soyez précis : incluez la marque, le modèle, la capacité et la couleur si pertinent."
          >
            ?
          </span>
        </div>
        <Input
          id="wiz-name"
          name="name"
          required
          disabled={isPending}
          defaultValue={product.name}
          placeholder="ex: Samsung Galaxy A55 128Go Noir"
        />
        <p className="text-xs text-muted-foreground">
          Soyez précis : marque, modèle, capacité, couleur si pertinent.
        </p>
      </div>

      {/* Marque + SKU */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-brand">Marque</Label>
          <Input
            id="wiz-brand"
            name="brand"
            disabled={isPending}
            defaultValue={product.brand ?? ""}
            placeholder="ex: Samsung"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-sku">SKU</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Référence interne pour identifier ce produit dans vos stocks."
            >
              ?
            </span>
          </div>
          <Input
            id="wiz-sku"
            name="sku"
            disabled={isPending}
            defaultValue={product.sku ?? ""}
            placeholder="ex: SAM-A55-128-BLK"
            className="bg-muted/40"
          />
          <p className="text-xs text-muted-foreground">
            Laissez vide si vous n&apos;avez pas de référence interne.
          </p>
        </div>
      </div>

      {/* Catégorie */}
      <div className="space-y-1.5">
        <Label>
          Catégorie <span className="text-destructive">*</span>
        </Label>
        <CategoryCascadingSelect
          categories={categories}
          defaultCategoryId={product.category_id || undefined}
        />
      </div>

      {/* Step hint */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        💡 Le nom et la catégorie suffisent pour passer à l&apos;étape suivante.
        Vous pourrez toujours revenir pour compléter.
      </div>
    </form>
  );
}
