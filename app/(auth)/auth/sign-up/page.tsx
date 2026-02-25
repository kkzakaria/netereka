import dynamic from "next/dynamic";
import Link from "next/link";
import { AuthCard } from "@/components/storefront/auth/auth-card";

const SignUpForm = dynamic(() =>
  import("./sign-up-form").then((m) => m.SignUpForm)
);

export default function SignUpPage() {
  return (
    <AuthCard
      title="Créer un compte"
      description="Inscrivez-vous pour commencer vos achats"
      footer={
        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
