"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { TurnstileCaptcha } from "@/components/storefront/auth/turnstile-captcha";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
        fetchOptions: captchaToken
          ? { headers: { "x-captcha-token": captchaToken } }
          : undefined,
      });

      if (error) {
        setError(error.message ?? "Une erreur est survenue.");
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Entrez votre email pour recevoir un lien de réinitialisation"
      footer={
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="font-semibold text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Si un compte existe avec cet email, vous recevrez un lien de
            réinitialisation.
          </p>
        </div>
      ) : (
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

          <TurnstileCaptcha onVerify={setCaptchaToken} />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
