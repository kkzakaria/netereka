"use client";

import { ViewProvider } from "@/components/admin/view-context";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { OrderTable } from "@/components/admin/order-table";
import { OrderCardMobile } from "@/components/admin/order-card-mobile";
import { OrderFilters } from "@/components/admin/order-filters";
import { OrderFilterSheet } from "@/components/admin/order-filter-sheet";
import type { OrderListItem } from "@/lib/db/types";

interface OrdersClientWrapperProps {
  orders: OrderListItem[];
  communes: string[];
}

export function OrdersClientWrapper({
  orders,
  communes,
}: OrdersClientWrapperProps) {
  return (
    <ViewProvider>
      <div className="w-full space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mobile: filter sheet */}
          <OrderFilterSheet communes={communes} className="lg:hidden" />

          {/* Desktop: inline filters */}
          <div className="hidden lg:block">
            <OrderFilters communes={communes} />
          </div>

          {/* View switcher - show on larger mobile screens */}
          <ViewSwitcher className="ml-auto hidden sm:flex lg:hidden" />
        </div>

        {/* Data list */}
        <ResponsiveDataList
          data={orders}
          renderTable={(data) => <OrderTable orders={data} />}
          renderCard={(order) => <OrderCardMobile order={order} />}
          emptyMessage="Aucune commande trouvée"
        />
      </div>
    </ViewProvider>
  );
}
