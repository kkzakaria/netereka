"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/lib/types/cart";

interface AddToCartButtonProps {
  item: Omit<CartItem, "quantity">;
  className?: string;
}

export function AddToCartButton({ item, className }: AddToCartButtonProps) {
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    add(item);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        "w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80"
      }
    >
      {added ? "✓ Ajouté" : "Ajouter au panier"}
    </button>
  );
}
