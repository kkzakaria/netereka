import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/storefront/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Mot de passe oublié</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="text-center text-xs text-muted-foreground">
        <Link
          href="/auth/login"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
