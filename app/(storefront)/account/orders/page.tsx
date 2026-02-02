import { requireAuth } from "@/lib/auth/guards";
import { getUserOrders } from "@/lib/db/orders";
import { OrderCard } from "@/components/storefront/order-card";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "shipping", label: "En cours" },
  { key: "delivered", label: "Livrées" },
  { key: "cancelled", label: "Annulées" },
];

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const session = await requireAuth();
  const sp = await searchParams;
  const status = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 10;

  const { orders, total } = await getUserOrders(session.user.id, {
    limit,
    offset: (page - 1) * limit,
    status: status || undefined,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Mes commandes</h2>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/account/orders${tab.key ? `?status=${tab.key}` : ""}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              status === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucune commande trouvée
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/account/orders?${status ? `status=${status}&` : ""}page=${p}`}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-xs font-medium",
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
