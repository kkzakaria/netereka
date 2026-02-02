"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Order, OrderItem } from "@/lib/db/types";

interface OrderConfirmationProps {
  order: Order;
  items: OrderItem[];
}

export function OrderConfirmation({ order, items }: OrderConfirmationProps) {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);

  return (
    <div className="space-y-6 text-center">
      {/* Success header */}
      <div className="space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Commande confirmee !</h1>
        <p className="text-muted-foreground">
          Merci pour votre commande. Vous recevrez une confirmation par SMS.
        </p>
        <Badge variant="secondary" className="text-base">
          {order.order_number}
        </Badge>
      </div>

      {/* Order details */}
      <Card className="text-left">
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Adresse de livraison</p>
            <p className="font-medium">{order.delivery_address}</p>
            <p className="text-sm text-muted-foreground">{order.delivery_phone}</p>
            {order.delivery_instructions && (
              <p className="text-sm text-muted-foreground">
                {order.delivery_instructions}
              </p>
            )}
          </div>

          {order.estimated_delivery && (
            <div>
              <p className="text-sm text-muted-foreground">Livraison estimee</p>
              <p className="font-medium">
                {formatDateTime(order.estimated_delivery)}
              </p>
            </div>
          )}

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-muted-foreground">{item.variant_name}</p>
                  )}
                  <p className="text-muted-foreground">Qte: {item.quantity}</p>
                </div>
                <p className="font-medium">{formatPrice(item.total_price)}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Livraison</span>
              <span>{formatPrice(order.delivery_fee)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Reduction</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
            Paiement a la livraison (especes)
          </div>
        </CardContent>
      </Card>

      <Button asChild size="lg" className="w-full">
        <Link href="/">Retour a l&apos;accueil</Link>
      </Button>
    </div>
  );
}
