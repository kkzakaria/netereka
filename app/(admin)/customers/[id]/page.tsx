import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminCustomerById } from "@/lib/db/admin/customers";
import { CustomerInfo } from "./_components/customer-info";
import { CustomerAddresses } from "./_components/customer-addresses";
import { CustomerOrders } from "./_components/customer-orders";
import { CustomerSidebar } from "./_components/customer-sidebar";

interface Props {
  params: Promise<{ id: string }>;
}

const backIcon = <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />;

export default async function CustomerDetailPage({ params }: Props) {
  // Parallelize auth check and params resolution (async-parallel)
  const [session, { id }] = await Promise.all([requireAdmin(), params]);
  const customer = await getAdminCustomerById(id);

  if (!customer) notFound();

  const isSuperAdmin = session.user.role === "super_admin";

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-11 w-11 shrink-0"
          aria-label="Retour à la liste des clients"
        >
          <Link href="/customers">{backIcon}</Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            {customer.name}
          </h1>
          <p className="text-sm text-muted-foreground">Détails du client</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <CustomerInfo customer={customer} />
          <CustomerAddresses addresses={customer.addresses} />
          <CustomerOrders orders={customer.recent_orders} />
        </div>

        {/* Sidebar */}
        <CustomerSidebar customer={customer} isSuperAdmin={isSuperAdmin} />
      </div>
    </div>
  );
}
