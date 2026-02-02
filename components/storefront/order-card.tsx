import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/format";

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  confirmed: { label: "Confirmée", variant: "secondary" },
  preparing: { label: "En préparation", variant: "secondary" },
  shipping: { label: "En livraison", variant: "default" },
  delivered: { label: "Livrée", variant: "default" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

export function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status as OrderStatus] ?? { label: order.status, variant: "outline" as const };

  return (
    <Link
      href={`/account/orders/${order.order_number}`}
      className="block rounded-xl border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold">{formatPrice(order.total)}</span>
      </div>
    </Link>
  );
}

export { statusConfig };
