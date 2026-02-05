"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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

const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  USER_NOT_FOUND: "Aucun compte trouvé avec cet email.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Réessayez plus tard.",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminSignInValues>({
    resolver: zodResolver(adminSignInSchema),
  });

  const onSubmit = async (data: AdminSignInValues) => {
    setServerError("");

    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",
        fetchOptions: captchaToken
          ? { headers: { "x-captcha-response": captchaToken } }
          : undefined,
      });

      if (error) {
        setServerError(
          errorMessages[error.code ?? ""] ??
            error.message ??
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

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Une erreur réseau est survenue. Réessayez.");
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">NETEREKA</h1>
          <p className="text-sm text-muted-foreground">Espace Administration</p>
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
                  placeholder="admin@netereka.com"
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

              <TurnstileCaptcha onVerify={setCaptchaToken} />

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
