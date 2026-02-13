"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { useCartStore, useCartHydrated } from "@/stores/cart-store";
import { syncCart } from "@/actions/cart";

function mergeAndSync() {
  const localItems = useCartStore.getState().items;
  syncCart(localItems)
    .then((merged) => useCartStore.getState().setItems(merged))
    .catch(() => {});
}

export function CartSync() {
  const session = authClient.useSession();
  const hydrated = useCartHydrated();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) return;
    if (session.isPending) return;

    const userId = session.data?.user?.id ?? null;
    const prevUserId = prevUserIdRef.current;

    // First evaluation after hydration — set baseline
    if (prevUserId === undefined) {
      prevUserIdRef.current = userId;
      if (userId) mergeAndSync();
      return;
    }

    // Login: null → userId
    if (!prevUserId && userId) {
      mergeAndSync();
    }

    // Logout: userId → null — clear local cart but keep KV for next login
    if (prevUserId && !userId) {
      useCartStore.getState().setItems([]);
    }

    prevUserIdRef.current = userId;
  }, [hydrated, session.isPending, session.data?.user?.id]);

  return null;
}
