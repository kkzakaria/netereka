"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  ViewIcon,
  PrinterIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionSheet, type ActionSheetItem } from "./action-sheet";
import { formatPrice, formatOrderDate } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, getOrderStatus } from "@/lib/constants/orders";
import type { OrderListItem } from "@/lib/db/types";

interface OrderCardMobileProps {
  order: OrderListItem;
}

export function OrderCardMobile({ order }: OrderCardMobileProps) {
  const router = useRouter();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const orderStatus = getOrderStatus(order.status);
  const statusConfig = ORDER_STATUS_CONFIG[orderStatus];

  const actions: ActionSheetItem[] = [
    {
      label: "Voir détails",
      icon: ViewIcon,
      onClick: () => {
        router.push(`/orders/${order.id}`);
      },
    },
    {
      label: "Voir facture",
      icon: PrinterIcon,
      onClick: () => {
        router.push(`/orders/${order.id}/invoice`);
      },
    },
  ];

  return (
    <>
      <Link
        href={`/orders/${order.id}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30 active:bg-muted/50 touch-manipulation"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 100px" }}
      >
        {/* Order icon placeholder */}
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          <HugeiconsIcon
            icon={ShoppingBag01Icon}
            size={32}
            className="text-muted-foreground"
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          {/* Order number + date */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-medium">
              {order.order_number}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatOrderDate(order.created_at)}
            </span>
          </div>

          {/* Customer name + phone */}
          <div className="truncate text-sm">{order.user_name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {order.delivery_phone}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {order.delivery_commune}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {order.item_count} art.
            </Badge>
            <StatusBadge
              status={orderStatus}
              label={statusConfig.label}
              variant={statusConfig.variant}
              className="text-[10px]"
            />
          </div>

          {/* Total */}
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatPrice(order.total)}
          </div>
        </div>

        {/* Action button - stops propagation to prevent navigation */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActionSheetOpen(true);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Plus d'options"
        >
          <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
        </button>
      </Link>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={order.order_number}
        items={actions}
      />
    </>
  );
}
