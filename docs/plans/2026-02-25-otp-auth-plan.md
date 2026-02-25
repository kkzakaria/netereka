# OTP Email Auth — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter la vérification OTP par email lors de l'inscription et remplacer le lien magic du reset de mot de passe par un code OTP à 6 chiffres.

**Architecture:** Utiliser le plugin `emailOTP` de better-auth (v1.4.18) côté serveur et `emailOTPClient` côté client. Le plugin stocke les OTP dans D1 via Kysely (déjà configuré), gère expiry (5 min), tentatives max (3), et génération sécurisée nativement. L'envoi se fait via Resend (déjà configuré dans `lib/notifications/email.ts`).

**Tech Stack:** better-auth `emailOTP` plugin, `emailOTPClient` client plugin, Resend (email), Next.js App Router, React Hook Form, Zod

---

## Task 1 : Template email OTP

**Files:**
- Modify: `lib/notifications/templates.ts`
- Test: `__tests__/unit/email-templates.test.ts`

**Contexte:** Le projet a déjà un layout HTML email avec les couleurs NETEREKA (navy `#183C78`, mint `#00FF9C`) dans la fonction `layout()`. Les tests existants dans `__tests__/unit/email-templates.test.ts` servent de modèle.

### Étape 1 : Écrire le test qui échoue

Ajouter à la fin de `__tests__/unit/email-templates.test.ts` :

```typescript
// ─── otpEmail ───

import { otpEmail } from "@/lib/notifications/templates";

describe("otpEmail", () => {
  it("retourne un sujet et un html pour email-verification", () => {
    const { subject, html } = otpEmail({ otp: "123456", type: "email-verification" });
    expect(subject).toBe("Vérifiez votre email - NETEREKA");
    expect(html).toContain("123456");
    expect(html).toContain("5 minutes");
  });

  it("retourne un sujet et un html pour forget-password", () => {
    const { subject, html } = otpEmail({ otp: "654321", type: "forget-password" });
    expect(subject).toBe("Réinitialisation de mot de passe - NETEREKA");
    expect(html).toContain("654321");
    expect(html).toContain("5 minutes");
  });

  it("échappe un OTP malformé", () => {
    const { html } = otpEmail({ otp: "<xss>", type: "email-verification" });
    expect(html).not.toContain("<xss>");
  });
});
```

### Étape 2 : Vérifier que le test échoue

```bash
npm run test -- --reporter=verbose __tests__/unit/email-templates.test.ts
```

Attendu : FAIL — `otpEmail is not exported`

### Étape 3 : Implémenter `otpEmail` dans `lib/notifications/templates.ts`

Ajouter à la fin du fichier (après `orderStatusUpdateEmail`) :

```typescript
// ---------------------------------------------------------------------------
// Template: OTP (email-verification | forget-password)
// ---------------------------------------------------------------------------

export function otpEmail(data: {
  otp: string;
  type: "email-verification" | "forget-password";
}): { subject: string; html: string } {
  const isVerification = data.type === "email-verification";
  const title = isVerification
    ? "Vérifiez votre email"
    : "Réinitialisation de mot de passe";
  const subject = `${title} - NETEREKA`;
  const escapedOtp = escapeHtml(data.otp);

  const body = `
    <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND_NAVY};text-align:center;">${title}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;text-align:center;">
      ${isVerification
        ? "Entrez ce code pour vérifier votre email :"
        : "Entrez ce code pour réinitialiser votre mot de passe :"}
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;padding:16px 32px;background-color:#f4f4f5;border-radius:8px;font-size:32px;font-weight:700;font-family:monospace;letter-spacing:8px;color:${BRAND_NAVY};">
        ${escapedOtp}
      </span>
    </div>
    <p style="margin:0;font-size:13px;color:#71717a;text-align:center;">
      Ce code expire dans <strong>5 minutes</strong>.${isVerification ? " Ne le partagez avec personne." : ""}
    </p>
  `;

  return { subject, html: layout(title, body) };
}
```

### Étape 4 : Vérifier que le test passe

```bash
npm run test -- --reporter=verbose __tests__/unit/email-templates.test.ts
```

Attendu : PASS — tous les tests du fichier

### Étape 5 : Commit

```bash
git add lib/notifications/templates.ts __tests__/unit/email-templates.test.ts
git commit -m "feat(auth): add OTP email template for verification and password reset"
```

---

## Task 2 : Plugin emailOTP côté serveur + client

**Files:**
- Modify: `lib/auth/index.ts`
- Modify: `lib/auth/client.ts`

**Contexte:** `lib/auth/index.ts` importe `{ betterAuth }` et `{ captcha }` de better-auth. Il faut ajouter `emailOTP` au tableau `plugins`. Le `sendVerificationOTP` callback reçoit `{ email, otp, type }` et doit appeler `sendEmail` depuis `lib/notifications/email.ts` avec le template `otpEmail`.

**Pas de test unitaire ici** — la config better-auth est testée via les tests d'intégration UI.

### Étape 1 : Modifier `lib/auth/index.ts`

Ajouter l'import en tête de fichier :

```typescript
import { emailOTP } from "better-auth/plugins";
import { sendEmail } from "@/lib/notifications/email";
import { otpEmail } from "@/lib/notifications/templates";
```

Dans le tableau `plugins: [...]`, ajouter le plugin après `captcha(...)` :

```typescript
emailOTP({
  sendVerificationOTP: async ({ email, otp, type }) => {
    if (type === "sign-in") return; // not used in this app
    const { subject, html } = otpEmail({
      otp,
      type: type as "email-verification" | "forget-password",
    });
    await sendEmail({ to: email, subject, html });
  },
  otpLength: 6,
  expiresIn: 300,
  allowedAttempts: 3,
  sendVerificationOnSignUp: true,
  overrideDefaultEmailVerification: true,
}),
```

### Étape 2 : Modifier `lib/auth/client.ts`

Remplacer le contenu par :

```typescript
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, emailOTPClient } from "better-auth/client/plugins";
import type { Auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>(), emailOTPClient()],
});
```

### Étape 3 : Vérifier les types

```bash
npx tsc --noEmit
```

Attendu : aucune erreur

### Étape 4 : Commit

```bash
git add lib/auth/index.ts lib/auth/client.ts
git commit -m "feat(auth): add emailOTP plugin for sign-up verification and password reset"
```

---

## Task 3 : Page de vérification email après inscription

**Files:**
- Create: `app/(auth)/auth/verify-email/layout.tsx`
- Create: `app/(auth)/auth/verify-email/page.tsx`
- Modify: `app/(auth)/auth/sign-up/sign-up-form.tsx`

**Contexte :**
- La page lit `email` depuis les query params URL
- `authClient.emailOtp.verifyEmail({ email, otp })` est l'appel client (endpoint `/email-otp/verify-email`)
- En cas de succès, créer la session + redirect vers `/`
- "Renvoyer le code" appelle `authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })`
- Toujours inclure `Suspense` autour de l'usage de `useSearchParams()`
- Le layout suit le pattern des autres layouts dans `app/(auth)/auth/*/layout.tsx`

**Pas de test unitaire** — page client interactive

### Étape 1 : Créer `app/(auth)/auth/verify-email/layout.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vérification de l'email",
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

### Étape 2 : Créer `app/(auth)/auth/verify-email/page.tsx`

```typescript
"use client";

import { Suspense, useState } from "react";
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
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
};

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

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
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendSuccess(false);
    setResendLoading(true);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setResendSuccess(true);
    } catch {
      setError("Impossible d'envoyer le code. Réessayez.");
    } finally {
      setResendLoading(false);
    }
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
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={loading || otp.length !== 6}>
        {loading ? "Vérification..." : "Vérifier mon email"}
      </Button>

      <div className="text-center">
        {resendSuccess ? (
          <p className="text-sm text-muted-foreground">Code renvoyé !</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Envoi..." : "Renvoyer le code"}
          </button>
        )}
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
```

### Étape 3 : Modifier `app/(auth)/auth/sign-up/sign-up-form.tsx`

Dans le bloc `else { ... }` du handler `onSubmit`, remplacer :

```typescript
} else {
  router.push("/");
  router.refresh();
}
```

Par :

```typescript
} else {
  router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
}
```

### Étape 4 : Vérifier les types

```bash
npx tsc --noEmit
```

Attendu : aucune erreur

### Étape 5 : Commit

```bash
git add "app/(auth)/auth/verify-email/layout.tsx" "app/(auth)/auth/verify-email/page.tsx" "app/(auth)/auth/sign-up/sign-up-form.tsx"
git commit -m "feat(auth): add email OTP verification page after sign-up"
```

---

## Task 4 : Réinitialisation du mot de passe par OTP

**Files:**
- Modify: `app/(auth)/auth/forgot-password/page.tsx`
- Modify: `app/(auth)/auth/reset-password/page.tsx`

**Contexte :**
- Forgot password : remplacer `authClient.requestPasswordReset` par `authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" })`, puis rediriger vers `/auth/reset-password?email=...`
- Reset password : actuellement lit `token` depuis l'URL et appelle `authClient.resetPassword({ newPassword, token })`. À remplacer : lire `email` depuis l'URL, afficher champ OTP + nouveau mot de passe + confirmation, appeler `authClient.emailOtp.resetPassword({ email, otp, password })` (noter : le paramètre s'appelle `password`, pas `newPassword`)
- Conserver le captcha sur la page forgot-password

**Pas de test unitaire** — pages client interactives

### Étape 1 : Remplacer `app/(auth)/auth/forgot-password/page.tsx`

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { TurnstileCaptcha } from "@/components/storefront/auth/turnstile-captcha";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

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
```

### Étape 2 : Remplacer `app/(auth)/auth/reset-password/page.tsx`

```typescript
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { PasswordInput } from "@/components/storefront/auth/password-input";
import { authClient } from "@/lib/auth/client";

const errorMessages: Record<string, string> = {
  INVALID_OTP: "Code incorrect. Vérifiez le code reçu.",
  OTP_EXPIRED: "Code expiré. Retournez à la page précédente pour demander un nouveau code.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!email) {
      setError("Lien de réinitialisation invalide. Recommencez depuis la page mot de passe oublié.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (error) {
        setError(
          errorMessages[error.code ?? ""] ??
            errorMessages[error.message ?? ""] ??
            "Une erreur est survenue. Veuillez réessayer."
        );
      } else {
        router.push("/auth/sign-in");
      }
    } finally {
      setLoading(false);
    }
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
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
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

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? "Réinitialisation..." : "Réinitialiser"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Réinitialiser le mot de passe"
      description="Entrez le code reçu par email et choisissez un nouveau mot de passe"
      footer={
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">
            Demander un nouveau code
          </Link>
        </p>
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
```

### Étape 3 : Vérifier les types

```bash
npx tsc --noEmit
```

Attendu : aucune erreur

### Étape 4 : Commit

```bash
git add "app/(auth)/auth/forgot-password/page.tsx" "app/(auth)/auth/reset-password/page.tsx"
git commit -m "feat(auth): replace magic link with OTP for password reset"
```

---

## Task 5 : Lint + Tests finaux

### Étape 1 : Lint

```bash
npm run lint
```

Attendu : aucune erreur ou warning

### Étape 2 : Suite de tests complète

```bash
npm run test
```

Attendu : tous les tests passent (y compris les nouveaux tests `otpEmail`)

### Étape 3 : Vérification TypeScript finale

```bash
npx tsc --noEmit
```

Attendu : aucune erreur

### Étape 4 : Commit final si nécessaire

Si des corrections mineures ont été faites :

```bash
git add -p
git commit -m "fix(auth): address lint/type issues in OTP implementation"
```

---

## Notes d'implémentation

### Import `better-auth/plugins`

```typescript
import { emailOTP } from "better-auth/plugins";
// PAS: import { emailOTP } from "better-auth/plugins/email-otp";
```

### Import `better-auth/client/plugins`

```typescript
import { emailOTPClient } from "better-auth/client/plugins";
```

### Paramètre du reset password

L'endpoint `/email-otp/reset-password` attend `password` (pas `newPassword`) — c'est la propriété définie dans le schema Zod du plugin.

### Chemins avec parenthèses

Pour `git add`, toujours utiliser des guillemets doubles :

```bash
git add "app/(auth)/auth/verify-email/layout.tsx"
```

### sendVerificationOTP callback

Le callback reçoit `type: "sign-in" | "email-verification" | "forget-password"`. Le type `"sign-in"` n'est pas utilisé dans cette app — il faut le gérer (return early).
