import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { TeamClientWrapper } from "./_components/team-client-wrapper";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/admin/sidebar";
import { getTeamMembers, getTeamMemberCount, type TeamFilters } from "@/lib/db/admin/team";
import { requireAdmin } from "@/lib/auth/guards";

interface Props {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function TeamPage({ searchParams }: Props) {
  const session = await requireAdmin();
  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);

  // Convert status string to boolean
  const isActive =
    params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  // First get count to validate page bounds
  const totalCount = await getTeamMemberCount({
    search: params.search,
    role: params.role as TeamFilters["role"],
    isActive,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Redirect if page is out of bounds
  if (requestedPage > totalPages && totalPages > 0) {
    const newParams = new URLSearchParams();
    if (params.search) newParams.set("search", params.search);
    if (params.role) newParams.set("role", params.role);
    if (params.status) newParams.set("status", params.status);
    newParams.set("page", String(totalPages));
    redirect(`/team?${newParams.toString()}`);
  }

  const page = Math.min(requestedPage, totalPages);
  const filters: TeamFilters = {
    search: params.search,
    role: params.role as TeamFilters["role"],
    isActive,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const members = await getTeamMembers(filters);

  // Only super_admin can add new team members
  const canAddMember = session.user.role === "super_admin";

  return (
    <div>
      <header className="mb-6 flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <HugeiconsIcon icon={Menu01Icon} size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <h1 className="text-2xl font-bold">Équipe</h1>
        {canAddMember && (
          <Button asChild className="ml-auto">
            <Link href="/team/create" className="gap-2">
              <HugeiconsIcon icon={Add01Icon} size={16} />
              Ajouter
            </Link>
          </Button>
        )}
      </header>

      {/* Client wrapper handles responsive filters + data list */}
      <TeamClientWrapper members={members} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalCount} membre(s) — Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/team",
                    query: { ...params, page: String(page - 1) },
                  }}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/team",
                    query: { ...params, page: String(page + 1) },
                  }}
                >
                  Suivant
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
