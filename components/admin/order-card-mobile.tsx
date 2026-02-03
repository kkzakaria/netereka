"use client";

import { useState } from "react";
import Link from "next/link";
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
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_CONFIG } from "@/lib/constants/orders";
import type { AdminOrder, OrderStatus } from "@/lib/db/types";

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

interface OrderCardMobileProps {
  order: AdminOrder;
}

export function OrderCardMobile({ order }: OrderCardMobileProps) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const status = ORDER_STATUS_CONFIG[order.status as OrderStatus] || ORDER_STATUS_CONFIG.pending;

  const actions: ActionSheetItem[] = [
    {
      label: "Voir détails",
      icon: ViewIcon,
      onClick: () => {
        window.location.href = `/orders/${order.id}`;
      },
    },
    {
      label: "Voir facture",
      icon: PrinterIcon,
      onClick: () => {
        window.location.href = `/orders/${order.id}/invoice`;
      },
    },
  ];

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30 touch-manipulation"
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
            <Link
              href={`/orders/${order.id}`}
              className="font-mono text-sm font-medium hover:underline"
            >
              {order.order_number}
            </Link>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDate(order.created_at)}
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
              status={order.status as OrderStatus}
              label={status.label}
              variant={status.variant}
              className="text-[10px]"
            />
          </div>

          {/* Total */}
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatPrice(order.total)}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => setActionSheetOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Actions"
        >
          <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
        </button>
      </div>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={order.order_number}
        items={actions}
      />
    </>
  );
}
