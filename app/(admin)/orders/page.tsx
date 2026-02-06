import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrdersClientWrapper } from "./_components/orders-client-wrapper";
import { OrderExportButton } from "@/components/admin/order-export-button";
import { Button } from "@/components/ui/button";
import {
  getAdminOrders,
  getAdminOrderCount,
  getDistinctCommunes,
} from "@/lib/db/admin/orders";
import type { OrderListItem } from "@/lib/db/types";

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

  const orderListData: OrderListItem[] = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    user_name: o.user_name,
    delivery_phone: o.delivery_phone,
    delivery_commune: o.delivery_commune,
    total: o.total,
    item_count: o.item_count,
    status: o.status,
  }));

  return (
    <div>
      <AdminPageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AdminHeader title="Commandes" />
          <OrderExportButton />
        </div>
      </AdminPageHeader>

      {/* Client wrapper handles responsive filters + data list */}
      <OrdersClientWrapper orders={orderListData} communes={communes} />

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
