"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { authClient } from "@/lib/auth/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

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

    if (!token) {
      setError("Lien de réinitialisation invalide.");
      return;
    }

    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error) {
      setError(error.message ?? "Une erreur est survenue.");
      setLoading(false);
    } else {
      router.push("/auth/sign-in");
    }
  };

  return (
    <AuthCard
      title="Réinitialiser le mot de passe"
      description="Choisissez un nouveau mot de passe"
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
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
    </AuthCard>
  );
}
