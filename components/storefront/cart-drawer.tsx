"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel } from "@hugeicons/core-free-icons";
import { useCartStore, useCartSubtotal } from "@/stores/cart-store";
import { CartItemRow } from "@/components/storefront/cart-item-row";
import { formatPrice } from "@/lib/utils/format";

export function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const open = useCartStore((s) => s.drawerOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const subtotal = useCartSubtotal();

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Panier"
        className={`fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col bg-background shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">
            Panier ({items.length})
          </h2>
          <button
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Fermer"
          >
            <HugeiconsIcon icon={Cancel} size={20} />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
            <p className="text-muted-foreground">Votre panier est vide</p>
            <Link
              href="/"
              onClick={close}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              Découvrir nos produits
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {items.map((item) => (
                <CartItemRow
                  key={`${item.productId}:${item.variantId ?? "default"}`}
                  item={item}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="border-t p-4 space-y-3">
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/cart"
                  onClick={close}
                  className="rounded-xl border py-2.5 text-center text-sm font-medium hover:bg-muted"
                >
                  Voir le panier
                </Link>
                <Link
                  href="/checkout"
                  onClick={close}
                  className="rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Commander
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
