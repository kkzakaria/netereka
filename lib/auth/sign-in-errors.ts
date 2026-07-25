/**
 * User-facing French copy for sign-in failures, kept as pure lookups so the
 * mapping logic can be unit-tested without mounting the sign-in form.
 */

// better-auth synthesizes error.code from the message via better-call's
// APIError. Rate limiter and captcha plugin bypass this path and return
// error.message directly (see errorTextMessages below).
export const errorCodeMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  EMAIL_NOT_VERIFIED:
    "Votre adresse e-mail n'est pas encore vérifiée. Vérifiez votre boîte de réception ou demandez un nouveau code.",
};

export const errorTextMessages: Record<string, string> = {
  "Too many requests. Please try again later.": "Trop de tentatives. Réessayez plus tard.",
  "Captcha verification failed": "La vérification captcha a échoué. Veuillez réessayer.",
  "Missing CAPTCHA response": "Veuillez compléter la vérification de sécurité.",
  "Something went wrong": "Une erreur est survenue. Veuillez réessayer.",
};

export const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Veuillez réessayer.";

// Messages for the `error` query-string parameter that better-auth's OAuth
// callback route appends when it redirects back to `errorCallbackURL` on
// failure (node_modules/better-auth/dist/oauth2/errors.mjs `redirectOnError`
// sets `?error=<code>`; codes are derived from handleOAuthUserInfo's error
// strings with spaces replaced by underscores, e.g. "account not linked" ->
// "account_not_linked").
//
// `account.accountLinking.disableImplicitLinking: true` means an existing
// local account holder who tries a social provider with the same email hits
// this refusal as an ordinary flow, not just an attacker. There is no
// client-side account-linking journey in this app (grep confirms it), so the
// message must not promise one — it points back to the password they
// already have.
const oauthCallbackErrorMessages: Record<string, string> = {
  account_not_linked:
    "Un compte existe déjà avec cette adresse e-mail. Connectez-vous avec votre mot de passe.",
};

/**
 * Maps the `error` query param appended by better-auth's OAuth callback
 * redirect to a user-facing French message.
 *
 * Returns null when no code is present (nothing to display). Falls back to
 * the generic message for any error code not explicitly mapped above, so no
 * known OAuth failure is left presenting as a blank or "not found" page.
 */
export function getOAuthCallbackErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return oauthCallbackErrorMessages[code] ?? GENERIC_ERROR_MESSAGE;
}
