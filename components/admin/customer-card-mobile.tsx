"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionSheet, type ActionSheetItem } from "./action-sheet";
import { formatPrice } from "@/lib/utils";
import type { AdminCustomer } from "@/lib/db/types";

// Hoisted static icon (rendering-hoist-jsx)
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={20} />;

interface CustomerCardMobileProps {
  customer: AdminCustomer;
}

const ROLE_LABELS: Record<string, string> = {
  customer: "Client",
  admin: "Admin",
  super_admin: "Super Admin",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  customer: "secondary",
  admin: "default",
  super_admin: "destructive",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CustomerCardMobile({ customer }: CustomerCardMobileProps) {
  const router = useRouter();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  // Stable callback to avoid recreating on each render (rerender-memo-with-default-value)
  const handleViewDetails = useCallback(() => {
    router.push(`/customers/${customer.id}`);
  }, [router, customer.id]);

  // Memoize actions array (rerender-memo-with-default-value)
  const actions = useMemo<ActionSheetItem[]>(
    () => [{ label: "Voir détails", icon: ViewIcon, onClick: handleViewDetails }],
    [handleViewDetails]
  );

  return (
    <>
      <Link
        href={`/customers/${customer.id}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30 active:bg-muted/50 touch-manipulation"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 100px" }}
      >
        {/* Avatar */}
        <Avatar className="h-16 w-16 shrink-0">
          {customer.image && <AvatarImage src={customer.image} alt={customer.name} />}
          <AvatarFallback className="text-lg">
            {getInitials(customer.name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          {/* Name + date */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{customer.name}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDate(customer.createdAt)}
            </span>
          </div>

          {/* Email */}
          <div className="truncate text-sm text-muted-foreground">
            {customer.email}
          </div>

          {/* Phone */}
          {customer.phone && (
            <div className="truncate text-xs text-muted-foreground">
              {customer.phone}
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge
              variant={ROLE_VARIANTS[customer.role] || "secondary"}
              className="text-[10px]"
            >
              {ROLE_LABELS[customer.role] || customer.role}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {customer.order_count} cmd.
            </Badge>
            {customer.is_active === 0 && (
              <Badge variant="destructive" className="text-[10px]">
                Inactif
              </Badge>
            )}
          </div>

          {/* Total spent */}
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatPrice(customer.total_spent)}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActionSheetOpen(true);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Plus d'options"
        >
          {moreIcon}
        </button>
      </Link>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={customer.name}
        items={actions}
      />
    </>
  );
}
