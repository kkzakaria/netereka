import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPrice, formatOrderDate } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, getOrderStatus } from "@/lib/constants/orders";
import type { AdminOrder } from "@/lib/db/types";

interface CustomerOrdersProps {
  orders: AdminOrder[];
}

export function CustomerOrders({ orders }: CustomerOrdersProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historique des commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune commande</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          Historique des commandes ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {orders.map((order) => {
            const orderStatus = getOrderStatus(order.status);
            const statusConfig = ORDER_STATUS_CONFIG[orderStatus];
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">
                      {order.order_number}
                    </span>
                    <StatusBadge
                      status={orderStatus}
                      label={statusConfig.label}
                      variant={statusConfig.variant}
                      className="text-[10px]"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatOrderDate(order.created_at)}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {order.item_count} art.
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-mono text-sm font-semibold">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
