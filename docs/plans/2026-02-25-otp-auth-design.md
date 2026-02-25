# Design — OTP Email Auth

**Date:** 2026-02-25
**Statut:** Approuvé

## Objectif

Implémenter la vérification OTP par email pour :
1. **Inscription** — vérification de l'email après création du compte
2. **Réinitialisation du mot de passe** — remplacer le lien magic par un code OTP

## Approche retenue

Utiliser le plugin **`emailOTP`** de better-auth (v1.4.18), qui :
- Stocke les OTP dans D1 (via Kysely, compatible avec la config existante)
- Gère expiry, tentatives max, génération sécurisée nativement
- Expose des endpoints et un client plugin ready-to-use

## Architecture

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `lib/auth/index.ts` | Ajouter le plugin `emailOTP` avec `sendVerificationOTP` |
| `lib/auth/client.ts` | Ajouter `emailOTPClient` plugin |
| `lib/notifications/templates.ts` | Ajouter `otpEmail({ otp, type })` |
| `app/(auth)/auth/sign-up/sign-up-form.tsx` | Redirect vers `/auth/verify-email?email=...` après signup |
| `app/(auth)/auth/forgot-password/page.tsx` | Appeler `emailOtp.sendVerificationOtp` au lieu de `requestPasswordReset` |
| `app/(auth)/auth/reset-password/page.tsx` | Lire `email` depuis URL, afficher champ OTP + nouveau mdp |

### Fichiers créés

| Fichier | Description |
|---|---|
| `app/(auth)/auth/verify-email/page.tsx` | Page de saisie OTP pour vérification email post-inscription |
| `app/(auth)/auth/verify-email/layout.tsx` | Layout auth standard |

## Configuration du plugin

```typescript
emailOTP({
  sendVerificationOTP: async ({ email, otp, type }) => {
    await sendEmail({ to: email, ...otpEmail({ otp, type }) });
  },
  otpLength: 6,
  expiresIn: 300,         // 5 minutes
  allowedAttempts: 3,
  sendVerificationOnSignUp: true,
  overrideDefaultEmailVerification: true,
})
```

## Flux UX

### Inscription

```
SignUpForm.onSubmit()
  → authClient.signUp.email({ email, password, name, phone })
      [better-auth crée le compte, envoie OTP automatiquement]
  → redirect /auth/verify-email?email=...
      [utilisateur saisit le code à 6 chiffres]
  → authClient.emailOtp.verifyEmail({ email, otp })
      [email vérifié, session créée]
  → redirect /
```

### Réinitialisation du mot de passe

```
ForgotPassword.onSubmit(email)
  → authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" })
  → redirect /auth/reset-password?email=...
      [utilisateur saisit OTP + nouveau mot de passe + confirmation]
  → authClient.emailOtp.resetPassword({ email, otp, newPassword })
  → redirect /auth/sign-in
```

## Templates email OTP

- **email-verification** — Sujet : "Vérifiez votre email - NETEREKA"
- **forget-password** — Sujet : "Réinitialisation de mot de passe - NETEREKA"
- Code affiché en 32px, monospace, centré (lisible sur mobile)
- Expiry rappelé dans le corps du mail

## Gestion des erreurs

| Code better-auth | Message utilisateur |
|---|---|
| `INVALID_OTP` | "Code incorrect. Vérifiez le code reçu." |
| `OTP_EXPIRED` | "Code expiré. Cliquez sur « Renvoyer le code »." |
| `TOO_MANY_ATTEMPTS` | "Trop de tentatives. Demandez un nouveau code." |
| Rate limit | "Trop de tentatives. Réessayez plus tard." |

## Contraintes

- Email livré via Resend (déjà configuré)
- Pas de SMS dans cette itération
- OTP à 6 chiffres, expire en 5 min, 3 tentatives max
