import { getDashboardStats } from "@/lib/db/admin/dashboard";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatsCard } from "@/components/admin/stats-card";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <AdminPageHeader>
        <AdminHeader title="Dashboard" />
      </AdminPageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Produits"
          value={stats.totalProducts}
          description={`${stats.activeProducts} actif(s)`}
        />
        <StatsCard title="Catégories" value={stats.totalCategories} />
        <StatsCard
          title="Stock faible"
          value={stats.lowStockCount}
          description="≤ 5 unités"
        />
        <StatsCard title="Taux actif" value={
          stats.totalProducts > 0
            ? `${Math.round((stats.activeProducts / stats.totalProducts) * 100)}%`
            : "—"
        } />
      </div>
    </div>
  );
}
