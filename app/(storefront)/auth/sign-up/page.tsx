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
import { TurnstileCaptcha } from "@/components/storefront/auth/turnstile-captcha";
import { authClient } from "@/lib/auth/client";

const errorMessages: Record<string, string> = {
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
  INVALID_EMAIL: "Adresse email invalide.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Réessayez plus tard.",
};

const PHONE_PATTERN = "^\\+225\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}$";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        phone,
        callbackURL: "/",
        fetchOptions: captchaToken
          ? { headers: { "x-captcha-token": captchaToken } }
          : undefined,
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
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input
            id="name"
            placeholder="Jean Kouamé"
            className="h-9"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+225 07 00 00 00 00"
            pattern={PHONE_PATTERN}
            title="Format : +225 XX XX XX XX XX"
            className="h-9"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Mot de passe</Label>
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

        <TurnstileCaptcha onVerify={setCaptchaToken} />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Création..." : "Créer mon compte"}
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
