import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusTimeline } from "@/components/storefront/order-status-timeline";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { OrderStatusHistory } from "@/components/admin/order-status-history";
import { formatPrice } from "@/lib/utils";
import type { AdminOrderDetail } from "@/lib/db/types";

interface OrderMainContentProps {
  order: AdminOrderDetail;
}

export function OrderMainContent({ order }: OrderMainContentProps) {
  return (
    <div className="space-y-6 lg:col-span-2">
      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Statut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderStatusTimeline status={order.status} />
          <Separator />
          <OrderStatusActions orderId={order.id} currentStatus={order.status} />
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Articles ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                // content-visibility for long item lists (rendering-content-visibility)
                style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
              >
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-xs text-muted-foreground">
                      {item.variant_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <p className="font-mono text-sm">
                  {formatPrice(item.total_price)}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-mono">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Livraison</span>
              <span className="font-mono">
                {formatPrice(order.delivery_fee)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Réduction</span>
                <span className="font-mono">
                  -{formatPrice(order.discount_amount)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="font-mono">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historique des statuts</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusHistory history={order.status_history} />
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton for Suspense fallback
export function OrderMainContentSkeleton() {
  return (
    <div className="space-y-6 lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-12 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
