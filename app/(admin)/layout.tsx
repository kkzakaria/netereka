import { requireAdmin } from "@/lib/auth/guards";
import { Sidebar } from "@/components/admin/sidebar";
import { ViewProvider } from "@/components/admin/view-context";
import { AdminUserProvider, type AdminUser } from "@/components/admin/admin-user-context";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <AdminUserProvider user={session.user as AdminUser}>
    <ViewProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r bg-sidebar lg:block">
          <Sidebar />
        </aside>
        <main className="flex-1 h-dvh overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
        <Toaster richColors position="top-right" />
      </div>
    </ViewProvider>
    </AdminUserProvider>
  );
}
