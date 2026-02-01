"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { SocialLoginButtons } from "@/components/storefront/auth/social-login-buttons";
import { authClient } from "@/lib/auth/client";

const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  USER_NOT_FOUND: "Aucun compte trouvé avec cet email.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Réessayez plus tard.",
};

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (error) {
        setError(
          errorMessages[error.code ?? ""] ?? error.message ?? "Une erreur est survenue."
        );
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

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
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            className="h-9"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </Button>
      </form>

      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          OU
        </span>
      </div>

      <SocialLoginButtons />
    </AuthCard>
  );
}
