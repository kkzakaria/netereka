"use client";

import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete } from "@hugeicons/core-free-icons";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import type { CartItem } from "@/lib/types/cart";

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="flex gap-3">
      {/* Image */}
      <Link
        href={`/p/${item.slug}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {item.imageUrl ? (
          <Image
            src={getImageUrl(item.imageUrl)}
            alt={item.name}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Photo
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/p/${item.slug}`}
            className="line-clamp-2 text-sm font-medium leading-tight hover:underline"
          >
            {item.name}
          </Link>
          {item.variantName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.variantName}
            </p>
          )}
        </div>
        <p className="text-sm font-semibold">{formatPrice(item.price)}</p>
      </div>

      {/* Quantity + remove */}
      <div className="flex shrink-0 flex-col items-end justify-between">
        <button
          onClick={() => remove(item.productId, item.variantId)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Retirer"
        >
          <HugeiconsIcon icon={Delete} size={16} />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              updateQuantity(item.productId, item.variantId, item.quantity - 1)
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border text-sm hover:bg-muted"
            aria-label="Diminuer la quantité"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <button
            onClick={() =>
              updateQuantity(item.productId, item.variantId, item.quantity + 1)
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border text-sm hover:bg-muted"
            aria-label="Augmenter la quantité"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
