import type { Metadata } from "next";
import { AuthView } from "@daveyplate/better-auth-ui";

const titles: Record<string, string> = {
  "sign-in": "Connexion",
  "sign-up": "Créer un compte",
  "forgot-password": "Mot de passe oublié",
  "reset-password": "Réinitialiser le mot de passe",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pathname: string[] }>;
}): Promise<Metadata> {
  const { pathname } = await params;
  const slug = pathname[0];
  return {
    title: titles[slug] ?? "Authentification",
  };
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ pathname: string[] }>;
}) {
  const { pathname } = await params;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <AuthView pathname={pathname.join("/")} />
      </div>
    </div>
  );
}
