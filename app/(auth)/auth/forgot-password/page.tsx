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
  const [captchaKey, setCaptchaKey] = useState(0);
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!captchaToken) {
      setError("Veuillez compléter la vérification de sécurité.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });

      if (error) {
        resetCaptcha();
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

          <TurnstileCaptcha
            key={captchaKey}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
          />

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
