import { requireAdmin } from "@/lib/auth/guards";
import { Sidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
