"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { SocialLoginButtons } from "@/components/storefront/auth/social-login-buttons";
import { authClient } from "@/lib/auth/client";

const TurnstileCaptcha = dynamic(
  () =>
    import("@/components/storefront/auth/turnstile-captcha").then(
      (m) => m.TurnstileCaptcha
    ),
  { ssr: false }
);

const signInSchema = z.object({
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

type SignInValues = z.infer<typeof signInSchema>;

const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  USER_NOT_FOUND: "Aucun compte trouvé avec cet email.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Réessayez plus tard.",
};

export default function SignInPage() {
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInValues) => {
    setServerError("");

    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: "/",
      fetchOptions: captchaToken
        ? { headers: { "x-captcha-response": captchaToken } }
        : undefined,
    });

    if (error) {
      setServerError(
        errorMessages[error.code ?? ""] ?? error.message ?? "Une erreur est survenue."
      );
    } else {
      router.push("/");
      router.refresh();
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
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
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
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <TurnstileCaptcha onVerify={setCaptchaToken} />

        {serverError ? (
          <p className="text-sm text-destructive">{serverError}</p>
        ) : null}

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
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
