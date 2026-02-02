"use client";

import Link from "next/link";
import { useCartStore, useCartSubtotal } from "@/stores/cart-store";
import { CartItemRow } from "@/components/storefront/cart-item-row";
import { formatPrice } from "@/lib/utils/format";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartSubtotal();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20">
        <h1 className="mb-2 text-2xl font-bold">Votre panier est vide</h1>
        <p className="mb-6 text-muted-foreground">
          Parcourez notre catalogue pour trouver ce qu&apos;il vous faut
        </p>
        <Link
          href="/"
          className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Continuer mes achats
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panier ({items.length})</h1>
        <button
          onClick={() => {
            if (window.confirm("Vider le panier ?")) clear();
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Vider le panier
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={`${item.productId}:${item.variantId ?? "default"}`}
              className="rounded-xl border p-4"
            >
              <CartItemRow item={item} />
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="h-fit space-y-4 rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Livraison</span>
              <span className="text-muted-foreground">Calculée à la commande</span>
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Passer la commande
          </Link>
          <Link
            href="/"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}
