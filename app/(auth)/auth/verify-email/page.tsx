"use client";

import { Suspense, useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { authClient } from "@/lib/auth/client";

const errorMessages: Record<string, string> = {
  INVALID_OTP: "Code incorrect. Vérifiez le code reçu.",
  OTP_EXPIRED: "Code expiré. Cliquez sur « Renvoyer le code ».",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
  INVALID_EMAIL: "Lien de vérification invalide. Retournez à la page d'inscription.",
  USER_NOT_FOUND: "Compte introuvable. Retournez à la page d'inscription.",
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
};

// Hoisted to module scope — compiled once, not on every keystroke.
// Safe with .replace(): String.prototype.replace resets lastIndex on global regexps.
const DIGITS_ONLY = /\D/g;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();

  if (!email) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Lien invalide. Retournez à la page d&apos;inscription.
      </p>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
        if (error) {
          setError(
            errorMessages[error.code ?? ""] ??
              errorMessages[error.message ?? ""] ??
              "Une erreur est survenue. Veuillez réessayer."
          );
        } else {
          router.push("/");
          router.refresh();
        }
      } catch (err) {
        console.error("[verify-email] unexpected error during verifyEmail:", err);
        setError("Une erreur réseau est survenue. Réessayez.");
      }
    });
  };

  const handleResend = () => {
    setError("");
    setResendSuccess(false);
    startResend(async () => {
      try {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification",
        });
        if (error) {
          setError(
            errorMessages[error.code ?? ""] ??
              errorMessages[error.message ?? ""] ??
              "Impossible d'envoyer le code. Réessayez."
          );
        } else {
          setResendSuccess(true);
        }
      } catch (err) {
        console.error("[verify-email] unexpected error during resend:", err);
        setError("Impossible d'envoyer le code. Réessayez.");
      }
    });
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
          onChange={(e) => setOtp(e.target.value.replace(DIGITS_ONLY, ""))}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={isPending || otp.length !== 6}>
        {isPending ? "Vérification..." : "Vérifier mon email"}
      </Button>

      <div className="text-center">
        {resendSuccess ? (
          <p className="text-sm text-muted-foreground">Code renvoyé !</p>
        ) : null}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {isResending ? "Envoi..." : "Renvoyer le code"}
        </button>
      </div>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Vérifiez votre email"
      description="Un code à 6 chiffres a été envoyé à votre adresse email."
    >
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </AuthCard>
  );
}
