import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/guards";
import { getOrderDetail } from "@/lib/db/orders";
import { OrderStatusTimeline } from "@/components/storefront/order-status-timeline";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDateTime } from "@/lib/utils/format";
import { statusConfig } from "@/components/storefront/order-card";
import { CancelOrderButton } from "./cancel-button";

interface Props {
  params: Promise<{ orderNumber: string }>;
}

const ORDER_NUMBER_REGEX = /^ORD-[A-Z0-9]{4,10}$/;

export default async function OrderDetailPage({ params }: Props) {
  const session = await requireAuth();
  const { orderNumber } = await params;

  if (!ORDER_NUMBER_REGEX.test(orderNumber)) notFound();

  const result = await getOrderDetail(orderNumber, session.user.id);
  if (!result) notFound();

  const { order, items } = result;
  const status = statusConfig[order.status] ?? { label: order.status, variant: "outline" as const };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Commandes
        </Link>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{order.order_number}</h2>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Status timeline */}
      <OrderStatusTimeline status={order.status} />

      {/* Items */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Articles</h3>
        <div className="divide-y rounded-lg border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{item.product_name}</p>
                {item.variant_name && (
                  <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                )}
                <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatPrice(item.total_price)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2 rounded-lg border p-4 text-sm">
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
            <span>Réduction</span>
            <span>-{formatPrice(order.discount_amount)}</span>
          </div>
        )}
        <hr />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Delivery info */}
      <div className="space-y-1 text-sm">
        <h3 className="font-medium">Adresse de livraison</h3>
        <p className="text-muted-foreground">{order.delivery_address}</p>
        <p className="text-muted-foreground">{order.delivery_phone}</p>
        {order.delivery_instructions && (
          <p className="text-muted-foreground">Instructions: {order.delivery_instructions}</p>
        )}
      </div>

      {/* Cancel button */}
      {order.status === "pending" && (
        <CancelOrderButton orderNumber={order.order_number} />
      )}
    </div>
  );
}
