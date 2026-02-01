import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/storefront/auth/register-form";
import { OAuthButtons } from "@/components/storefront/auth/oauth-buttons";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Créer un compte",
};

export default function RegisterPage() {
  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Créer un compte</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Rejoignez NETEREKA pour commander vos appareils électroniques
        </p>
      </div>

      <OAuthButtons />

      <div className="relative">
        <Separator />
        <span className="bg-background text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs">
          ou
        </span>
      </div>

      <RegisterForm />

      <div className="text-center text-xs text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href="/auth/login"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
