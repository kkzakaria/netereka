import { requireAdmin } from "@/lib/auth/guards";
import { Sidebar } from "@/components/admin/sidebar";
import { ViewProvider } from "@/components/admin/view-context";
import { AdminUserProvider } from "@/components/admin/admin-user-context";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <AdminUserProvider user={session.user}>
    <ViewProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r bg-sidebar lg:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
        <Toaster richColors position="top-right" />
      </div>
    </ViewProvider>
    </AdminUserProvider>
  );
}
