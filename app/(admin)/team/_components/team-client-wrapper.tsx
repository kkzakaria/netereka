"use client";

import { ViewProvider } from "@/components/admin/view-context";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { TeamTable } from "@/components/admin/team-table";
import { TeamCardMobile } from "@/components/admin/team-card-mobile";
import { TeamFilters } from "@/components/admin/team-filters";
import { TeamFilterSheet } from "@/components/admin/team-filter-sheet";
import type { TeamMember } from "@/lib/db/types";

interface TeamClientWrapperProps {
  members: TeamMember[];
}

export function TeamClientWrapper({ members }: TeamClientWrapperProps) {
  return (
    <ViewProvider>
      <div className="w-full space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mobile: filter sheet */}
          <TeamFilterSheet className="lg:hidden" />

          {/* Desktop: inline filters */}
          <div className="hidden lg:block">
            <TeamFilters />
          </div>

          {/* View switcher - show on larger mobile screens */}
          <ViewSwitcher className="ml-auto hidden sm:flex lg:hidden" />
        </div>

        {/* Data list */}
        <ResponsiveDataList
          data={members}
          tableView={<TeamTable members={members} />}
          renderCard={(member) => <TeamCardMobile member={member} />}
          emptyMessage="Aucun membre trouvé"
        />
      </div>
    </ViewProvider>
  );
}
