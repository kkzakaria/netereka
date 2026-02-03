import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth/guards";
import { getTeamMemberByUserId } from "@/lib/db/admin/team";
import { ProfileInfoForm } from "./_components/profile-info-form";
import { AvatarUpload } from "./_components/avatar-upload";
import { PasswordForm } from "./_components/password-form";
import { PermissionsDisplay } from "./_components/permissions-display";

export default async function ProfilePage() {
  const session = await requireAdmin();
  const member = await getTeamMemberByUserId(session.user.id);

  if (!member) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Profil introuvable
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <HugeiconsIcon icon={Menu01Icon} size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <div>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos informations personnelles
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Avatar section */}
          <section>
            <h2 className="mb-4 text-base font-semibold">Photo de profil</h2>
            <AvatarUpload
              currentAvatarUrl={member.avatar_url}
              firstName={member.first_name}
              lastName={member.last_name}
            />
          </section>

          <hr />

          {/* Personal info */}
          <section>
            <h2 className="mb-4 text-base font-semibold">Informations personnelles</h2>
            <ProfileInfoForm
              defaultValues={{
                firstName: member.first_name,
                lastName: member.last_name,
                phone: member.phone ?? "",
                jobTitle: member.job_title ?? "",
              }}
              email={member.email}
            />
          </section>

          <hr />

          {/* Password */}
          <section>
            <h2 className="mb-4 text-base font-semibold">Changer le mot de passe</h2>
            <PasswordForm />
          </section>
        </div>

        {/* Sidebar - Permissions */}
        <div>
          <PermissionsDisplay
            role={member.role}
            permissions={member.permissions}
          />
        </div>
      </div>
    </div>
  );
}
