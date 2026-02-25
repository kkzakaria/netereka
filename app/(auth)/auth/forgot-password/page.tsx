"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { TurnstileCaptcha } from "@/components/storefront/auth/turnstile-captcha";
import { authClient } from "@/lib/auth/client";

const errorTextMessages: Record<string, string> = {
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
  "Captcha verification failed": "La vérification captcha a échoué. Veuillez réessayer.",
  "Missing CAPTCHA response": "Veuillez compléter la vérification de sécurité.",
  "Something went wrong": "Une erreur est survenue. Veuillez réessayer.",
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [captchaKey, setCaptchaKey] = useState(0);
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
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
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });

      if (error) {
        resetCaptcha();
        setError(
          errorTextMessages[error.message ?? ""] ?? "Une erreur est survenue."
        );
      } else {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      }
    } catch {
      resetCaptcha();
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Entrez votre email pour recevoir un code de réinitialisation"
      footer={
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="font-semibold text-primary hover:underline">
            Retour à la connexion
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

        <TurnstileCaptcha
          key={captchaKey}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer le code"}
        </Button>
      </form>
    </AuthCard>
  );
}
