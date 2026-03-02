"use client";

import { ViewProvider } from "@/components/admin/view-context";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { UserTable } from "@/components/admin/user-table";
import { UserCardMobile } from "@/components/admin/user-card-mobile";
import { UserFilters } from "@/components/admin/user-filters";
import { UserFilterSheet } from "@/components/admin/user-filter-sheet";
import { CreateAdminUserDialog } from "./create-admin-user-dialog";
import type { AdminUser } from "@/lib/db/admin/users";

interface UsersClientWrapperProps {
  users: AdminUser[];
  isSuperAdmin: boolean;
}

export function UsersClientWrapper({ users, isSuperAdmin }: UsersClientWrapperProps) {
  return (
    <ViewProvider>
      <div className="w-full space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mobile: filter sheet */}
          <UserFilterSheet className="lg:hidden" />

          {/* Desktop: inline filters */}
          <div className="hidden lg:block">
            <UserFilters />
          </div>

          {/* View switcher - show on larger mobile screens */}
          <ViewSwitcher className="ml-auto hidden sm:flex lg:hidden" />

          {/* Create admin user button — super_admin only */}
          {isSuperAdmin && (
            <div className="ml-auto lg:ml-0">
              <CreateAdminUserDialog />
            </div>
          )}
        </div>

        {/* Data list */}
        <ResponsiveDataList
          data={users}
          renderTable={(data) => <UserTable users={data} />}
          renderCard={(user) => <UserCardMobile user={user} />}
          emptyMessage="Aucun utilisateur trouvé"
        />
      </div>
    </ViewProvider>
  );
}
