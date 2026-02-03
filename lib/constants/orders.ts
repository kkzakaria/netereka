import {
  Time02Icon,
  CheckmarkCircle02Icon,
  Package02Icon,
  DeliveryTruck01Icon,
  CheckmarkSquare02Icon,
  Cancel01Icon,
  ArrowTurnBackwardIcon,
} from "@hugeicons/core-free-icons";
import type { OrderStatus } from "@/lib/db/types";

/**
 * Icons for each order status.
 * Provides visual differentiation beyond color alone (accessibility).
 */
export const ORDER_STATUS_ICONS = {
  pending: Time02Icon,
  confirmed: CheckmarkCircle02Icon,
  preparing: Package02Icon,
  shipping: DeliveryTruck01Icon,
  delivered: CheckmarkSquare02Icon,
  cancelled: Cancel01Icon,
  returned: ArrowTurnBackwardIcon,
} as const;

/**
 * Valid status transitions for orders.
 * Terminal states (cancelled, returned) have no valid transitions.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipping", "cancelled"],
  shipping: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

/**
 * Human-readable labels for order statuses (French).
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipping: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  returned: "Retournée",
};

/**
 * Action button labels for status transitions (French).
 */
export const ORDER_STATUS_ACTION_LABELS: Record<string, string> = {
  confirmed: "Confirmer",
  preparing: "Mettre en préparation",
  shipping: "Mettre en livraison",
  delivered: "Marquer livrée",
  cancelled: "Annuler",
  returned: "Traiter retour",
};

/**
 * Badge variants for status display in UI.
 */
export const ORDER_STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "outline",
  preparing: "outline",
  shipping: "default",
  delivered: "default",
  cancelled: "destructive",
  returned: "destructive",
};

/**
 * Combined status configuration for UI display.
 */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: ORDER_STATUS_LABELS.pending, variant: ORDER_STATUS_BADGE_VARIANTS.pending },
  confirmed: { label: ORDER_STATUS_LABELS.confirmed, variant: ORDER_STATUS_BADGE_VARIANTS.confirmed },
  preparing: { label: ORDER_STATUS_LABELS.preparing, variant: ORDER_STATUS_BADGE_VARIANTS.preparing },
  shipping: { label: ORDER_STATUS_LABELS.shipping, variant: ORDER_STATUS_BADGE_VARIANTS.shipping },
  delivered: { label: ORDER_STATUS_LABELS.delivered, variant: ORDER_STATUS_BADGE_VARIANTS.delivered },
  cancelled: { label: ORDER_STATUS_LABELS.cancelled, variant: ORDER_STATUS_BADGE_VARIANTS.cancelled },
  returned: { label: ORDER_STATUS_LABELS.returned, variant: ORDER_STATUS_BADGE_VARIANTS.returned },
};

/**
 * All valid order status values.
 */
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "shipping",
  "delivered",
  "cancelled",
  "returned",
];

/**
 * Type guard to check if a string is a valid OrderStatus.
 */
export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

/**
 * Safely get OrderStatus from a string, with fallback to "pending".
 */
export function getOrderStatus(value: string): OrderStatus {
  return isOrderStatus(value) ? value : "pending";
}

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

/**
 * Get the timestamp field name for a given status.
 */
export function getStatusTimestampField(status: OrderStatus): string | null {
  const fieldMap: Record<string, string> = {
    confirmed: "confirmed_at",
    preparing: "preparing_at",
    shipping: "shipping_at",
    delivered: "delivered_at",
    cancelled: "cancelled_at",
    returned: "returned_at",
  };
  return fieldMap[status] || null;
}
