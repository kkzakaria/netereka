import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { getAdminOrderById } from "@/lib/db/admin/orders";
import { OrderMainContent } from "./_components/order-main-content";
import { OrderSidebarAsync, OrderSidebarSkeleton } from "./_components/order-sidebar";

interface Props {
  params: Promise<{ id: string }>;
}

// Hoisted static icon (rendering-hoist-jsx)
const backIcon = <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />;

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) notFound();

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-11 w-11 shrink-0"
          aria-label="Retour à la liste des commandes"
        >
          <Link href="/orders">
            {backIcon}
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            {order.order_number}
          </h1>
          <p className="text-sm text-muted-foreground">Détails de la commande</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Synchronous since order data is already fetched */}
        <OrderMainContent order={order} />

        {/* Sidebar with Suspense - Fetches delivery persons independently (async-suspense-boundaries) */}
        <Suspense fallback={<OrderSidebarSkeleton />}>
          <OrderSidebarAsync order={order} />
        </Suspense>
      </div>
    </div>
  );
}
