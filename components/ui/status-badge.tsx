import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge, type badgeVariants } from "./badge";
import { ORDER_STATUS_ICONS } from "@/lib/constants/order-icons";
import type { VariantProps } from "class-variance-authority";
import type { OrderStatus } from "@/lib/db/types";

interface StatusBadgeProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof badgeVariants> {
  status: OrderStatus;
  label: string;
  showIcon?: boolean;
  iconSize?: number;
}

/**
 * StatusBadge - Badge with icon for order statuses.
 * Improves accessibility by not relying on color alone.
 */
export function StatusBadge({
  status,
  label,
  variant,
  showIcon = true,
  iconSize = 12,
  className,
  ...props
}: StatusBadgeProps) {
  const IconComponent = ORDER_STATUS_ICONS[status];

  return (
    <Badge variant={variant} className={className} {...props}>
      {showIcon && IconComponent && (
        <HugeiconsIcon
          icon={IconComponent}
          size={iconSize}
          data-icon="inline-start"
          aria-hidden="true"
        />
      )}
      {label}
    </Badge>
  );
}
