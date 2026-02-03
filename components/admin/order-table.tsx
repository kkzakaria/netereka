"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { formatPrice } from "@/lib/utils";
import type { AdminOrder } from "@/lib/db/types";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "outline" },
  preparing: { label: "Préparation", variant: "outline" },
  shipping: { label: "Livraison", variant: "default" },
  delivered: { label: "Livrée", variant: "default" },
  cancelled: { label: "Annulée", variant: "destructive" },
  returned: { label: "Retournée", variant: "destructive" },
};

// Hoisted date formatter options (rendering-hoist-jsx)
const dateFormatOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", dateFormatOptions);
}

// Hoisted static JSX element (rendering-hoist-jsx)
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={16} />;

// Memoized row component for better performance (rerender-memo)
const OrderRow = memo(function OrderRow({ order }: { order: AdminOrder }) {
  const status = statusConfig[order.status] || statusConfig.pending;
  return (
    <TableRow
      // content-visibility for rendering performance (rendering-content-visibility)
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 48px" }}
    >
      <TableCell>
        <Link
          href={`/orders/${order.id}`}
          className="font-mono text-xs font-medium hover:underline"
        >
          {order.order_number}
        </Link>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatDate(order.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{order.user_name}</span>
          <span className="text-muted-foreground text-[10px]">
            {order.delivery_phone}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {order.delivery_commune}
      </TableCell>
      <TableCell className="font-mono">
        {formatPrice(order.total)}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="secondary">{order.item_count}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              {moreIcon}
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/orders/${order.id}`}>Voir détails</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/orders/${order.id}/invoice`}>
                Voir facture
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

// Memoized table component to prevent unnecessary re-renders (rerender-memo)
export const OrderTable = memo(function OrderTable({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucune commande trouvée
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Commune</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="hidden md:table-cell">Articles</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
