import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/storefront/auth/login-form";
import { OAuthButtons } from "@/components/storefront/auth/oauth-buttons";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Connexion</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Connectez-vous à votre compte NETEREKA
        </p>
      </div>

      <OAuthButtons />

      <div className="relative">
        <Separator />
        <span className="bg-background text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs">
          ou
        </span>
      </div>

      <LoginForm />

      <div className="text-center text-xs text-muted-foreground">
        <Link
          href="/auth/forgot-password"
          className="hover:text-foreground underline underline-offset-4"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/auth/register"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
