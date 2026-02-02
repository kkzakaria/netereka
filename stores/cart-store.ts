"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types/cart";
import { cartItemKey } from "@/lib/types/cart";

const MAX_QUANTITY = 10;

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,

      add: (item, quantity = 1) =>
        set((state) => {
          const key = cartItemKey(item);
          const existing = state.items.find((i) => cartItemKey(i) === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartItemKey(i) === key
                  ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QUANTITY) }
                  : i
              ),
              drawerOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, quantity: Math.min(quantity, MAX_QUANTITY) }],
            drawerOpen: true,
          };
        }),

      remove: (productId, variantId) =>
        set((state) => {
          const key = cartItemKey({ productId, variantId });
          return { items: state.items.filter((i) => cartItemKey(i) !== key) };
        }),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          const key = cartItemKey({ productId, variantId });
          if (quantity <= 0) {
            return { items: state.items.filter((i) => cartItemKey(i) !== key) };
          }
          const clamped = Math.min(quantity, MAX_QUANTITY);
          return {
            items: state.items.map((i) =>
              cartItemKey(i) === key ? { ...i, quantity: clamped } : i
            ),
          };
        }),

      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "netereka-cart:v1",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(() => useCartStore.persist.hasHydrated());

  // Catch hydration that completed between useState init and effect setup
  if (!hydrated && useCartStore.persist.hasHydrated()) {
    setHydrated(true);
  }

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

export function useCartItemCount() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useCartSubtotal() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
}
