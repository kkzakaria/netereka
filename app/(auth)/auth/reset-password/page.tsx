"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { authClient } from "@/lib/auth/client";

const errorMessages: Record<string, string> = {
  INVALID_OTP: "Code incorrect. Vérifiez le code reçu.",
  OTP_EXPIRED: "Code expiré. Retournez à la page précédente pour demander un nouveau code.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!email) {
      setError("Lien de réinitialisation invalide. Recommencez depuis la page mot de passe oublié.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (error) {
        setError(
          errorMessages[error.code ?? ""] ??
            errorMessages[error.message ?? ""] ??
            "Une erreur est survenue. Veuillez réessayer."
        );
      } else {
        router.push("/auth/sign-in");
      }
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="otp">Code de vérification</Label>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          className="h-9 text-center tracking-widest text-lg font-mono"
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
        <PasswordInput
          id="confirm-password"
          placeholder="••••••••"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? "Réinitialisation..." : "Réinitialiser"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Réinitialiser le mot de passe"
      description="Entrez le code reçu par email et choisissez un nouveau mot de passe"
      footer={
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">
            Demander un nouveau code
          </Link>
        </p>
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
