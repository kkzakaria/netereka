import { requireAuth } from "@/lib/auth/guards";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const session = await requireAuth();
  const user = session.user;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-base font-semibold">Informations personnelles</h2>
        <ProfileForm
          defaultValues={{
            name: user.name,
            phone: String((user as Record<string, unknown>).phone ?? ""),
          }}
          email={user.email}
        />
      </section>

      <hr />

      <section>
        <h2 className="mb-4 text-base font-semibold">Changer le mot de passe</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
