import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { CustomersClientWrapper } from "./_components/customers-client-wrapper";
import { Button } from "@/components/ui/button";
import {
  getAdminCustomers,
  getAdminCustomerCount,
} from "@/lib/db/admin/customers";

interface Props {
  searchParams: Promise<{
    search?: string;
    role?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);

  // First get count to validate page bounds
  const totalCount = await getAdminCustomerCount({
    search: params.search,
    role: params.role,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Redirect if page is out of bounds
  if (requestedPage > totalPages && totalPages > 0) {
    const newParams = new URLSearchParams();
    if (params.search) newParams.set("search", params.search);
    if (params.role) newParams.set("role", params.role);
    if (params.dateFrom) newParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) newParams.set("dateTo", params.dateTo);
    newParams.set("page", String(totalPages));
    redirect(`/customers?${newParams.toString()}`);
  }

  const page = Math.min(requestedPage, totalPages);
  const filters = {
    search: params.search,
    role: params.role,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const customers = await getAdminCustomers(filters);

  return (
    <div>
      <AdminHeader title="Utilisateurs" />

      {/* Client wrapper handles responsive filters + data list */}
      <CustomersClientWrapper customers={customers} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalCount} utilisateur(s) — Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/customers",
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
                    pathname: "/customers",
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
