"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { SocialLoginButtons } from "@/components/storefront/auth/social-login-buttons";
import { authClient } from "@/lib/auth/client";
import { signUpSchema, type SignUpValues } from "@/lib/validations/sign-up";

const TurnstileCaptcha = dynamic(
  () =>
    import("@/components/storefront/auth/turnstile-captcha").then(
      (m) => m.TurnstileCaptcha
    ),
  { ssr: false }
);

// better-auth synthesizes error.code from the message via better-call's APIError.
// Rate limiter and captcha plugin bypass this path and return error.message directly.
const errorCodeMessages: Record<string, string> = {
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet email.",
  INVALID_EMAIL: "Adresse email invalide.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères.",
};

const errorTextMessages: Record<string, string> = {
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
  "Captcha verification failed": "La vérification captcha a échoué. Veuillez réessayer.",
  "Missing CAPTCHA response": "Veuillez compléter la vérification de sécurité.",
  "Something went wrong": "Une erreur est survenue. Veuillez réessayer.",
};

interface SignUpFormProps {
  onSuccess?: () => Promise<void>;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const router = useRouter();
  const [captchaKey, setCaptchaKey] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaKey((k) => k + 1);
  };

  const onSubmit = async (data: SignUpValues) => {
    setServerError("");

    if (!captchaToken) {
      setServerError("Veuillez compléter la vérification de sécurité.");
      return;
    }

    try {
      const { error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
        callbackURL: "/",
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });

      if (error) {
        resetCaptcha();
        setServerError(
          errorCodeMessages[error.code ?? ""] ??
            errorTextMessages[error.message ?? ""] ??
            "Une erreur est survenue. Veuillez réessayer."
        );
      } else if (onSuccess) {
        await onSuccess();
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err) {
      console.error("[sign-up] unexpected error during authClient.signUp.email:", err);
      resetCaptcha();
      setServerError("Une erreur réseau est survenue. Réessayez.");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input
            id="name"
            placeholder="Jean Kouamé"
            className="h-9"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            className="h-9"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+225 07 00 00 00 00"
            title="Format : +225 XX XX XX XX XX"
            className="h-9"
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <TurnstileCaptcha
          key={captchaKey}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => {
            console.error("[sign-up] Turnstile captcha widget error");
            setServerError(
              "La vérification de sécurité a rencontré un problème. Rechargez la page."
            );
          }}
        />

        {serverError ? (
          <p className="text-sm text-destructive">{serverError}</p>
        ) : null}

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Création..." : "Créer mon compte"}
        </Button>
      </form>

      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          OU
        </span>
      </div>

      <SocialLoginButtons />
    </>
  );
}
