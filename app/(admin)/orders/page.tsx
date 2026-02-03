import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { OrderTable } from "@/components/admin/order-table";
import { OrderFilters } from "@/components/admin/order-filters";
import { OrderExportButton } from "@/components/admin/order-export-button";
import { Button } from "@/components/ui/button";
import {
  getAdminOrders,
  getAdminOrderCount,
  getDistinctCommunes,
} from "@/lib/db/admin/orders";

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    commune?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = {
    search: params.search,
    status: params.status,
    commune: params.commune,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [orders, totalCount, communes] = await Promise.all([
    getAdminOrders(filters),
    getAdminOrderCount(filters),
    getDistinctCommunes(),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <AdminHeader title="Commandes" />

      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OrderFilters communes={communes} />
          <OrderExportButton />
        </div>
      </div>

      <OrderTable orders={orders} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalCount} commande(s) — Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/orders",
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
                    pathname: "/orders",
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
