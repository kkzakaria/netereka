// Aliased to avoid conflict with `export const dynamic = "force-dynamic"` below
import nextDynamic from "next/dynamic";
import { requireAdmin } from "@/lib/auth/guards";
import { Sidebar } from "@/components/admin/sidebar";
import { ViewProvider } from "@/components/admin/view-context";

const Toaster = nextDynamic(
  () => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false }
);

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <ViewProvider>
      <div className="flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
        <Toaster richColors position="top-right" />
      </div>
    </ViewProvider>
  );
}
