import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
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
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders">
            {backIcon}
          </Link>
        </Button>
        <AdminHeader title={`Commande ${order.order_number}`} />
      </div>

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
