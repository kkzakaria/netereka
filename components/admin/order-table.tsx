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
import { MoreVerticalIcon, ViewIcon, PrinterIcon } from "@hugeicons/core-free-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPrice, formatOrderDate } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, getOrderStatus } from "@/lib/constants/orders";
import type { OrderListItem } from "@/lib/db/types";

// Hoisted static JSX element (rendering-hoist-jsx)
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={16} />;

// Hoisted icons for dropdown menu (rendering-hoist-jsx)
const viewIcon = <HugeiconsIcon icon={ViewIcon} size={14} />;
const printerIcon = <HugeiconsIcon icon={PrinterIcon} size={14} />;

// Memoized row component for better performance (rerender-memo)
const OrderRow = memo(function OrderRow({ order }: { order: OrderListItem }) {
  const orderStatus = getOrderStatus(order.status);
  const statusConfig = ORDER_STATUS_CONFIG[orderStatus];
  return (
    <TableRow
      // content-visibility for rendering performance (rendering-content-visibility)
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 48px" }}
      className="transition-colors hover:bg-muted/50"
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
        {formatOrderDate(order.created_at)}
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
        <StatusBadge
          status={orderStatus}
          label={statusConfig.label}
          variant={statusConfig.variant}
        />
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
              <Link href={`/orders/${order.id}`} className="gap-2">
                {viewIcon}
                Voir détails
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/orders/${order.id}/invoice`} className="gap-2">
                {printerIcon}
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
export const OrderTable = memo(function OrderTable({ orders }: { orders: OrderListItem[] }) {
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
