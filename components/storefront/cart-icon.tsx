"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingBag } from "@hugeicons/core-free-icons";
import { useCartStore, useCartItemCount } from "@/stores/cart-store";

export function CartIcon() {
  const openDrawer = useCartStore((s) => s.openDrawer);
  const count = useCartItemCount();

  return (
    <button
      onClick={openDrawer}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={`Panier${count > 0 ? ` (${count})` : ""}`}
    >
      <HugeiconsIcon icon={ShoppingBag} size={20} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
