"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingBag, Tick02Icon } from "@hugeicons/core-free-icons";
import { useCartStore } from "@/stores/cart-store";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import type { Product } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  isWishlisted?: boolean;
  showWishlist?: boolean;
}

export function ProductCardActions({
  product,
  isWishlisted = false,
  showWishlist = false,
}: Props) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const hasVariants = (product.variant_count ?? 0) > 1;
  const isOutOfStock = product.stock_quantity <= 0;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleCartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (hasVariants) {
      router.push(`/p/${product.slug}`);
      return;
    }

    add({
      productId: product.id,
      variantId: null,
      name: product.name,
      variantName: null,
      price: product.base_price,
      imageUrl: product.image_url,
      slug: product.slug,
    });

    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Wishlist — top-right */}
      {showWishlist && (
        <WishlistButton
          productId={product.id}
          isWishlisted={isWishlisted}
          className="pointer-events-auto absolute right-2 top-2 size-11"
        />
      )}

      {/* Cart — bottom-right, hover-reveal */}
      {!isOutOfStock && (
        <button
          onClick={handleCartClick}
          className={cn(
            "pointer-events-auto absolute bottom-2 right-2",
            "flex size-10 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground shadow-md",
            "transition-all duration-200",
            "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
            "touch:opacity-100 touch:translate-y-0",
            "hover:bg-primary/90 active:scale-95",
            "focus-visible:opacity-100 focus-visible:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            added && "bg-emerald-600 hover:bg-emerald-600",
          )}
          aria-label={
            hasVariants ? "Choisir les options" : "Ajouter au panier"
          }
        >
          <HugeiconsIcon
            icon={added ? Tick02Icon : ShoppingBag}
            size={18}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}
