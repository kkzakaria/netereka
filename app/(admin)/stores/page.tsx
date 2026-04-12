import { requireAdmin } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAllStores } from "@/lib/db/admin/stores";
import { StoresPageClient } from "./stores-page-client";

export default async function StoresPage() {
  await requireAdmin();

  const stores = await getAllStores();

  return (
    <div>
      <AdminPageHeader className="space-y-4">
        <AdminHeader title="Boutiques" />
        <p className="text-sm text-muted-foreground">
          Gérez les boutiques physiques affichées sur le site.
        </p>
      </AdminPageHeader>

      <StoresPageClient stores={stores} />
    </div>
  );
}
