import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { requireAdmin } from "@/lib/auth/guards";
import { getTeamMemberById } from "@/lib/db/admin/team";
import { TeamMemberInfo } from "./_components/team-member-info";
import { TeamMemberSidebar } from "./_components/team-member-sidebar";

interface Props {
  params: Promise<{ id: string }>;
}

const backIcon = <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />;

export default async function TeamMemberDetailPage({ params }: Props) {
  // Parallelize auth check and params resolution
  const [session, { id }] = await Promise.all([requireAdmin(), params]);
  const member = await getTeamMemberById(id);

  if (!member) notFound();

  const isSuperAdmin = session.user.role === "super_admin";
  const isOwnProfile = session.user.id === member.user_id;

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-11 w-11 shrink-0"
          aria-label="Retour à la liste de l'équipe"
        >
          <Link href="/team">{backIcon}</Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            {member.first_name} {member.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">Profil du membre</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <TeamMemberInfo member={member} />
        </div>

        {/* Sidebar */}
        <TeamMemberSidebar
          member={member}
          isSuperAdmin={isSuperAdmin}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </div>
  );
}
