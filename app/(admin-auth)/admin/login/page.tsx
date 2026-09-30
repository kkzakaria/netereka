"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { authClient } from "@/lib/auth/client";
import { verifyAdminRole } from "@/actions/admin/auth";
import { getOAuthQuery } from "@/lib/auth/oauth-resume";

const TurnstileCaptcha = dynamic(
  () =>
    import("@/components/storefront/auth/turnstile-captcha").then(
      (m) => m.TurnstileCaptcha
    ),
  { ssr: false }
);

const adminSignInSchema = z.object({
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

type AdminSignInValues = z.infer<typeof adminSignInSchema>;

const errorCodeMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  USER_NOT_FOUND: "Aucun compte trouvé avec cet email.",
};

const errorTextMessages: Record<string, string> = {
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
  "Captcha verification failed": "La vérification captcha a échoué. Veuillez réessayer.",
  "Missing CAPTCHA response": "Veuillez compléter la vérification de sécurité.",
  "Something went wrong": "Une erreur est survenue. Veuillez réessayer.",
};

const OAUTH_EXPIRED =
  "La demande d'autorisation a expiré. Relancez la connexion depuis votre assistant.";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Requête OAuth signée quand on arrive depuis un assistant IA (voir oauth-resume.ts).
  const oauthQuery = getOAuthQuery(searchParams);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminSignInValues>({
    resolver: zodResolver(adminSignInSchema),
  });

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaKey((k) => k + 1);
  };

  const onSubmit = async (values: AdminSignInValues) => {
    setServerError("");

    if (!captchaToken) {
      setServerError("Veuillez compléter la vérification de sécurité.");
      return;
    }

    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: "/dashboard",
        // oauth_query : le serveur vérifie la signature, poursuit le flux OAuth et
        // répond { redirect: true, url } vers la page de consentement. Le champ
        // n'est pas typé par le client de connexion : on l'ajoute au corps.
        ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      } as Parameters<typeof authClient.signIn.email>[0]);

      if (error) {
        resetCaptcha();
        const raw = error as { code?: string; error?: string; message?: string };
        if (oauthQuery && raw.error === "invalid_signature") {
          setServerError(OAUTH_EXPIRED);
          return;
        }
        setServerError(
          errorCodeMessages[raw.code ?? ""] ??
            errorTextMessages[raw.message ?? ""] ??
            "Une erreur est survenue."
        );
        return;
      }

      // Verify admin role server-side
      const result = await verifyAdminRole();
      if (!result.success) {
        setServerError(result.error ?? "Accès refusé.");
        return;
      }

      // Le client better-auth suit déjà { redirect: true, url } de lui-même ; on
      // navigue ici aussi (après le contrôle de rôle) au cas où il ne l'aurait pas fait.
      const redirectUrl = (data as { redirect?: boolean; url?: string } | null)?.url;
      if (oauthQuery && redirectUrl) {
        // Navigation complète, pas router.push : la cible est la page de
        // consentement (ou le client OAuth lui-même).
        window.location.assign(redirectUrl);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      resetCaptcha();
      setServerError("Une erreur réseau est survenue. Réessayez.");
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="NETEREKA"
            width={180}
            height={64}
            className="mx-auto h-14 w-auto"
            priority
          />
          <p className="mt-2 text-sm text-muted-foreground">Espace Administration</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Connexion administrateur</CardTitle>
            <CardDescription>
              Accédez au panneau d&apos;administration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@netereka.ci"
                  className="h-11"
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  className="h-11"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <TurnstileCaptcha
                key={captchaKey}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
              />

              {serverError ? (
                <p className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Portail réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
}
