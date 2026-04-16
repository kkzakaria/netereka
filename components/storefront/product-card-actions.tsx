"use client";

import { useState } from "react";
import { ShoppingCart02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const WishlistButtonDynamic = dynamic(
  () =>
    import("@/components/storefront/wishlist-button-dynamic")
      .then((m) => m.WishlistButtonDynamic),
  { ssr: false }
);
import { useCartStore } from "@/stores/cart-store";

const VariantPickerDialog = dynamic(
  () =>
    import("@/components/storefront/variant-picker-dialog")
      .then((m) => m.VariantPickerDialog)
      .catch((err) => {
        console.error("[product-card-actions] Failed to load VariantPickerDialog chunk", err);
        throw err;
      }),
  { ssr: false }
);
const WhatsAppProductButton = dynamic(
  () =>
    import("@/components/storefront/whatsapp-product-button")
      .then((m) => m.WhatsAppProductButton),
  { ssr: false }
);
import type { ProductCardData } from "@/lib/db/types";

interface Props {
  product: ProductCardData;
}

export function ProductCardActions({ product }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const add = useCartStore((s) => s.add);

  const hasVariants = (product.variant_count ?? 0) > 1;
  const isOutOfStock = product.stock_quantity <= 0;

  function handleCartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (hasVariants) {
      setDialogOpen(true);
    } else {
      add({
        productId: product.id,
        variantId: null,
        name: product.name,
        variantName: null,
        price: product.base_price,
        imageUrl: product.image_url ?? null,
        slug: product.slug,
      });
    }
  }

  return (
    <>
      <div
        className="flex flex-col gap-1.5 border-t px-3 py-2 sm:flex-row sm:items-center sm:gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="lg"
          variant={isOutOfStock ? "outline" : "default"}
          disabled={isOutOfStock}
          className="w-full order-last sm:order-none sm:w-auto sm:flex-1"
          onClick={handleCartClick}
          aria-label={
            isOutOfStock
              ? "Rupture de stock"
              : `Ajouter ${product.name} au panier`
          }
        >
          <HugeiconsIcon icon={ShoppingCart02Icon} size={16} />
          {isOutOfStock ? "Rupture de stock" : "Ajouter"}
        </Button>

        <div className="flex gap-1.5 sm:contents">
          <div className="flex-1 sm:flex-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <WhatsAppProductButton
              productName={product.name}
              price={product.base_price}
              slug={product.slug}
              variant="icon"
              className="w-full sm:w-8"
            />
          </div>
          <div className="flex-1 sm:flex-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <WishlistButtonDynamic productId={product.id} className="w-full sm:w-8" />
          </div>
        </div>
      </div>

      {hasVariants && (
        <VariantPickerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          product={product}
        />
      )}
    </>
  );
}
