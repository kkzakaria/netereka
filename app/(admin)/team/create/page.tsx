import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { TeamMemberForm } from "./_components/team-member-form";

const backIcon = <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />;

export default async function CreateTeamMemberPage() {
  const session = await requireAdmin();

  // Only super_admin can create team members
  if (session.user.role !== "super_admin") {
    redirect("/team");
  }

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-11 w-11 shrink-0"
          aria-label="Retour à l'équipe"
        >
          <Link href="/team">{backIcon}</Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            Ajouter un membre
          </h1>
          <p className="text-sm text-muted-foreground">
            Créer un nouveau compte administrateur
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl">
        <TeamMemberForm />
      </div>
    </div>
  );
}
