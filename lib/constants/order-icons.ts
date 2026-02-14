import {
  Time02Icon,
  CheckmarkCircle02Icon,
  Package02Icon,
  DeliveryTruck01Icon,
  CheckmarkSquare02Icon,
  Cancel01Icon,
  ArrowTurnBackwardIcon,
} from "@hugeicons/core-free-icons";

/**
 * Icons for each order status.
 * Provides visual differentiation beyond color alone (accessibility).
 *
 * Separated from orders.ts to keep pure logic free of UI imports.
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
