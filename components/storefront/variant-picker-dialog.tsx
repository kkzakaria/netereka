"use client";

import { useReducer, useEffect } from "react";
import { ShoppingCart02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getProductVariants } from "@/actions/variants";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/lib/db/types";
import type { ProductCardData } from "@/lib/db/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductCardData;
}

interface State {
  variants: ProductVariant[];
  loading: boolean;
  selected: string | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_DONE"; variants: ProductVariant[] }
  | { type: "SELECT"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { variants: [], loading: true, selected: null };
    case "FETCH_DONE":
      return { ...state, loading: false, variants: action.variants };
    case "SELECT":
      return { ...state, selected: action.id };
  }
}

const initial: State = { variants: [], loading: false, selected: null };

export function VariantPickerDialog({ open, onOpenChange, product }: Props) {
  const [state, dispatch] = useReducer(reducer, initial);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "FETCH_START" });
    let cancelled = false;
    getProductVariants(product.id).then((variants) => {
      if (!cancelled) dispatch({ type: "FETCH_DONE", variants });
    });
    return () => {
      cancelled = true;
    };
  }, [open, product.id]);

  function handleAdd() {
    const variant = state.variants.find((v) => v.id === state.selected);
    if (!variant) return;
    add({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      price: variant.price,
      imageUrl: product.image_url ?? null,
      slug: product.slug,
    });
    onOpenChange(false);
  }

  const selectedVariant = state.variants.find((v) => v.id === state.selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{product.name}</DialogTitle>
        </DialogHeader>

        {state.loading ? (
          <div className="flex justify-center py-6">
            <span className="text-sm text-muted-foreground">Chargement…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {state.variants.map((v) => {
                const outOfStock = v.stock_quantity <= 0;
                return (
                  <button
                    key={v.id}
                    disabled={outOfStock}
                    onClick={() => dispatch({ type: "SELECT", id: v.id })}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      "disabled:pointer-events-none disabled:opacity-40",
                      state.selected === v.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {v.name}
                    {outOfStock && <span className="ml-1 text-[10px]">(épuisé)</span>}
                  </button>
                );
              })}
            </div>

            {selectedVariant && (
              <p className="text-sm font-bold tabular-nums">
                {formatPrice(selectedVariant.price)}
              </p>
            )}

            <Button
              size="touch"
              className="w-full"
              disabled={!state.selected}
              onClick={handleAdd}
            >
              <HugeiconsIcon icon={ShoppingCart02Icon} size={18} />
              Ajouter au panier
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
