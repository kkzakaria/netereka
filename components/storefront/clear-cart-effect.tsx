"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";

export function ClearCartEffect() {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);
  return null;
}
