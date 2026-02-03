"use client";

import { ViewProvider } from "@/components/admin/view-context";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { CustomerTable } from "@/components/admin/customer-table";
import { CustomerCardMobile } from "@/components/admin/customer-card-mobile";
import { CustomerFilters } from "@/components/admin/customer-filters";
import { CustomerFilterSheet } from "@/components/admin/customer-filter-sheet";
import type { AdminCustomer } from "@/lib/db/types";

interface CustomersClientWrapperProps {
  customers: AdminCustomer[];
}

export function CustomersClientWrapper({
  customers,
}: CustomersClientWrapperProps) {
  return (
    <ViewProvider>
      <div className="w-full space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mobile: filter sheet */}
          <CustomerFilterSheet className="lg:hidden" />

          {/* Desktop: inline filters */}
          <div className="hidden lg:block">
            <CustomerFilters />
          </div>

          {/* View switcher - show on larger mobile screens */}
          <ViewSwitcher className="ml-auto hidden sm:flex lg:hidden" />
        </div>

        {/* Data list */}
        <ResponsiveDataList
          data={customers}
          tableView={<CustomerTable customers={customers} />}
          renderCard={(customer) => <CustomerCardMobile customer={customer} />}
          emptyMessage="Aucun client trouvé"
        />
      </div>
    </ViewProvider>
  );
}
