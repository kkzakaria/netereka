"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { SocialLoginButtons } from "@/components/storefront/auth/social-login-buttons";
import { authClient } from "@/lib/auth/client";
import { signInSchema, type SignInValues } from "@/lib/validations/sign-in";
import {
  errorCodeMessages,
  errorTextMessages,
  getOAuthCallbackErrorMessage,
  GENERIC_ERROR_MESSAGE,
} from "@/lib/auth/sign-in-errors";

const TurnstileCaptcha = dynamic(
  () =>
    import("@/components/storefront/auth/turnstile-captcha").then(
      (m) => m.TurnstileCaptcha
    ),
  { ssr: false }
);

interface SignInFormProps {
  onSuccess?: () => Promise<void>;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [captchaKey, setCaptchaKey] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  // Picks up the `error` query param better-auth's OAuth callback appends
  // when it redirects back here on failure (e.g. no social account linked
  // to an existing local account — see lib/auth/sign-in-errors.ts).
  const [serverError, setServerError] = useState(
    () => getOAuthCallbackErrorMessage(searchParams.get("error")) ?? ""
  );
  // Tracks an EMAIL_NOT_VERIFIED failure so the message can offer a direct
  // link to /auth/verify-email carrying the email the user just typed
  // (that page reads the address from the URL, not from the session).
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
  });

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaKey((k) => k + 1);
  };

  const onSubmit = async (data: SignInValues) => {
    setServerError("");
    setUnverifiedEmail("");

    if (!captchaToken) {
      setServerError("Veuillez compléter la vérification de sécurité.");
      return;
    }

    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/",
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });

      if (error) {
        resetCaptcha();
        const code = error.code ?? "";
        if (code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(data.email);
        }
        setServerError(
          errorCodeMessages[code] ??
            errorTextMessages[error.message ?? ""] ??
            GENERIC_ERROR_MESSAGE
        );
      } else if (onSuccess) {
        await onSuccess();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("[sign-in] unexpected error during authClient.signIn.email:", err);
      resetCaptcha();
      setServerError("Une erreur réseau est survenue. Réessayez.");
    }
  };

  return (
    <>
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

        <TurnstileCaptcha
          key={captchaKey}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => {
            console.error("[sign-in] Turnstile captcha widget error");
            setServerError(
              "La vérification de sécurité a rencontré un problème. Rechargez la page."
            );
          }}
        />

        {serverError ? (
          <p className="text-sm text-destructive">
            {serverError}
            {unverifiedEmail ? (
              <>
                {" "}
                <Link
                  href={`/auth/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="font-semibold underline"
                >
                  Vérifier mon email
                </Link>
              </>
            ) : null}
          </p>
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
    </>
  );
}
