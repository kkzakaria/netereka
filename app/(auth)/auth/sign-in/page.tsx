import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AuthCard } from "@/components/storefront/auth/auth-card";

const SignInForm = dynamic(() =>
  import("./sign-in-form").then((m) => m.SignInForm)
);

export default function SignInPage() {
  return (
    <AuthCard
      title="Connexion"
      description="Connectez-vous à votre compte"
      footer={
        <p className="text-sm text-muted-foreground">
          Pas de compte ?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      }
    >
      {/* SignInForm reads the OAuth callback's `error` query param via
          useSearchParams, which requires a Suspense boundary — same pattern
          as verify-email and reset-password. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
