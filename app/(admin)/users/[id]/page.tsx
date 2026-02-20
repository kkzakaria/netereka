import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminUserById } from "@/lib/db/admin/users";
import { UserInfo } from "./_components/user-info";
import { UserSidebar } from "./_components/user-sidebar";

interface Props {
  params: Promise<{ id: string }>;
}

const backIcon = <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />;

export default async function UserDetailPage({ params }: Props) {
  const userPromise = params.then(({ id }) => getAdminUserById(id));
  const session = await requireAdmin();
  const user = await userPromise;

  if (!user) notFound();

  const isSuperAdmin = session.user.role === "super_admin";

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour à la liste des utilisateurs"
          >
            <Link href="/users">{backIcon}</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Fiche utilisateur
            </p>
          </div>
        </header>
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <UserInfo user={user} />
        </div>

        {/* Sidebar */}
        <UserSidebar
          user={user}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
