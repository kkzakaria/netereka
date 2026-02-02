"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types/cart";
import { cartItemKey } from "@/lib/types/cart";

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
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              drawerOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, quantity }],
            drawerOpen: true,
          };
        }),

      remove: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => cartItemKey(i) !== `${productId}:${variantId ?? "default"}`
          ),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) => cartItemKey(i) !== `${productId}:${variantId ?? "default"}`
              ),
            };
          }
          return {
            items: state.items.map((i) =>
              cartItemKey(i) === `${productId}:${variantId ?? "default"}`
                ? { ...i, quantity }
                : i
            ),
          };
        }),

      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "netereka-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function useCartItemCount() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useCartSubtotal() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
}
