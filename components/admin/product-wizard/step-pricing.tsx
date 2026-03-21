// components/admin/product-wizard/step-pricing.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ProductDetail } from "@/lib/db/types";

interface StepPricingProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

export function StepPricing({ product, formRef, isPending }: StepPricingProps) {
  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="2" />

      {/* Prix */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-base-price">
            Prix de vente <span className="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupInput
              id="wiz-base-price"
              name="base_price"
              type="number"
              min={0}
              step={1}
              required
              disabled={isPending}
              defaultValue={product.base_price > 0 ? product.base_price : ""}
              placeholder="ex: 125000"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-compare-price">Prix barré</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Ancien prix avant promotion. Affiché barré sur la fiche produit."
            >
              ?
            </span>
          </div>
          <InputGroup>
            <InputGroupInput
              id="wiz-compare-price"
              name="compare_price"
              type="number"
              min={0}
              step={1}
              disabled={isPending}
              defaultValue={product.compare_price ?? ""}
              placeholder="Optionnel"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Stock */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-stock">Quantité en stock</Label>
          <Input
            id="wiz-stock"
            name="stock_quantity"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.stock_quantity}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-threshold">Seuil d&apos;alerte stock</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Vous serez alerté lorsque le stock passe sous ce seuil."
            >
              ?
            </span>
          </div>
          <Input
            id="wiz-threshold"
            name="low_stock_threshold"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.low_stock_threshold}
          />
        </div>
      </div>

      {/* Poids */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="wiz-weight">Poids</Label>
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
            title="Utilisé pour le calcul des frais de livraison."
          >
            ?
          </span>
        </div>
        <InputGroup>
          <InputGroupInput
            id="wiz-weight"
            name="weight_grams"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.weight_grams ?? ""}
            placeholder="Optionnel"
          />
          <InputGroupAddon align="inline-end">g</InputGroupAddon>
        </InputGroup>
      </div>
    </form>
  );
}
