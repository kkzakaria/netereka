import { describe, it, expect } from "vitest";
import { buildAuthOptions, CAPTCHA_ENDPOINTS, mcpResourceUrl } from "@/lib/auth/index";

const env = {
  BETTER_AUTH_SECRET: "test-secret",
  SITE_URL: "https://netereka.ci",
  TURNSTILE_SECRET_KEY: "test-turnstile",
  GOOGLE_CLIENT_ID: "g",
  GOOGLE_CLIENT_SECRET: "g",
  FACEBOOK_APP_ID: "f",
  FACEBOOK_APP_SECRET: "f",
  APPLE_CLIENT_ID: "a",
  APPLE_CLIENT_SECRET: "a",
} as never;

describe("auth configuration — account linking", () => {
  it("disables implicit OAuth account linking", () => {
    const opts = buildAuthOptions(env);
    expect(opts.account?.accountLinking?.disableImplicitLinking).toBe(true);
  });

  it("trusts no provider implicitly", () => {
    const opts = buildAuthOptions(env);
    expect(opts.account?.accountLinking?.trustedProviders).toEqual([]);
  });

  it("does not allow linking across differing email addresses", () => {
    const opts = buildAuthOptions(env);
    expect(opts.account?.accountLinking?.allowDifferentEmails).toBe(false);
  });

  it("requires email verification before a credential account is usable", () => {
    const opts = buildAuthOptions(env);
    expect(opts.emailAndPassword?.requireEmailVerification).toBe(true);
  });
});

describe("auth configuration — password reset", () => {
  it("revokes every other session when a user resets their password via OTP", () => {
    // Without this, resetPasswordEmailOTP (email-otp/routes.mjs) writes the
    // new hash but never calls deleteUserSessions — an attacker's session
    // would survive the very recovery step meant to end it.
    const opts = buildAuthOptions(env);
    expect(opts.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
  });
});

describe("auth configuration — rate limiting", () => {
  it("derives the client IP from Cloudflare's trusted header, not X-Forwarded-For", () => {
    const opts = buildAuthOptions(env);
    expect(opts.advanced?.ipAddress?.ipAddressHeaders).toEqual(["cf-connecting-ip"]);
  });

  it("does not fall back to the in-memory store", () => {
    const opts = buildAuthOptions(env);
    expect(opts.rateLimit?.storage).toBe("database");
  });

  it("keeps the sensitive endpoint rules", () => {
    const opts = buildAuthOptions(env);
    expect(opts.rateLimit?.customRules?.["/sign-in/email"]).toMatchObject({ max: 5 });
    expect(opts.rateLimit?.customRules?.["/email-otp/send-verification-otp"]).toMatchObject({
      max: 3,
    });
  });

  it("keeps D1 as the sole session/verification store (no secondaryStorage)", () => {
    const opts = buildAuthOptions(env);
    // Cast: the literal return type of buildAuthOptions has no
    // secondaryStorage key at all (it was removed, not set to undefined), so
    // TS rejects a direct property access. BetterAuthOptions declares it as
    // optional — this asserts the invariant it stays that way.
    expect((opts as { secondaryStorage?: unknown }).secondaryStorage).toBeUndefined();
  });
});

describe("auth configuration — captcha coverage", () => {
  it("protects every endpoint that can trigger an outbound email", () => {
    // Asserted against the exported constant rather than the plugin's
    // internal structure — stable across better-auth internals, per the
    // brief's preferred variant.
    expect(CAPTCHA_ENDPOINTS).toContain("/sign-up/email");
    expect(CAPTCHA_ENDPOINTS).toContain("/sign-in/email");
    expect(CAPTCHA_ENDPOINTS).toContain("/forget-password");
    expect(CAPTCHA_ENDPOINTS).toContain("/request-password-reset");
    expect(CAPTCHA_ENDPOINTS).toContain("/email-otp/send-verification-otp");
    expect(CAPTCHA_ENDPOINTS).toContain("/email-otp/request-password-reset");
    // Core better-auth endpoint (api/routes/email-verification.mjs), not part
    // of the email-otp plugin. Unconditionally mounted; sends a real OTP
    // email in this app because emailOTP({ overrideDefaultEmailVerification:
    // true }) wires its init() hook to emailVerification.sendVerificationEmail.
    // No client code in this app calls it, but nothing stops a direct POST.
    expect(CAPTCHA_ENDPOINTS).toContain("/send-verification-email");
  });

  it("wires the constant into the captcha plugin's endpoint list", () => {
    const opts = buildAuthOptions(env);
    const captchaPlugin = opts.plugins?.find((p) => p.id === "captcha");
    const endpoints = (captchaPlugin as { options?: { endpoints?: string[] } })?.options?.endpoints;

    expect(endpoints).toEqual([...CAPTCHA_ENDPOINTS]);
  });
});

describe("auth configuration — MCP OAuth provider (better-auth 1.7)", () => {
  type ProviderOptions = {
    loginPage?: string;
    consentPage?: string;
    resources?: (string | { identifier: string })[];
    clientRegistrationDefaultResources?: string[];
    grantTypes?: string[];
    allowDynamicClientRegistration?: boolean;
    allowUnauthenticatedClientRegistration?: boolean;
    skipConsent?: boolean;
    schema?: Record<string, { modelName?: string }>;
  };

  function plugins() {
    return buildAuthOptions(env).plugins as { id: string; options?: ProviderOptions }[];
  }
  function provider() {
    return plugins().find((p) => p.id === "oauth-provider");
  }

  it("compose jwt(), mcp() (le fournisseur OAuth) et cimd()", () => {
    const ids = plugins().map((p) => p.id);
    expect(ids).toContain("jwt");
    expect(ids).toContain("cimd");
    expect(ids.filter((id) => id === "oauth-provider")).toHaveLength(1);
  });

  it("n'enregistre pas de second oauthProvider() à côté de mcp()", () => {
    // mcp() EST le fournisseur ; un deuxième doublerait les points /oauth2/*.
    expect(plugins().filter((p) => p.id === "oauth-provider")).toHaveLength(1);
    expect(plugins().some((p) => p.id === "mcp")).toBe(false);
  });

  it("pointe vers la page de connexion et de consentement admin", () => {
    expect(provider()?.options?.loginPage).toBe("/admin/login");
    expect(provider()?.options?.consentPage).toBe("/admin/mcp/consent");
  });

  it("déclare /api/mcp comme ressource protégée canonique en HTTPS", () => {
    // mcp() consomme `resource` et le republie dans `resources` (jeton lié à l'audience).
    expect(provider()?.options?.resources).toEqual(["https://netereka.ci/api/mcp"]);
    expect(provider()?.options?.clientRegistrationDefaultResources).toEqual(["https://netereka.ci/api/mcp"]);
  });

  it("n'active aucun enregistrement dynamique de client (CIMD uniquement)", () => {
    const opts = provider()?.options;
    expect(opts?.allowDynamicClientRegistration).toBeFalsy();
    expect(opts?.allowUnauthenticatedClientRegistration).toBeFalsy();
  });

  it("ne dispense aucun client du consentement", () => {
    expect(provider()?.options?.skipConsent).toBeUndefined();
  });

  it("limite les grants à authorization_code et refresh_token", () => {
    expect(provider()?.options?.grantTypes).toEqual(["authorization_code", "refresh_token"]);
  });

  it("n'écrase pas les tables 1.6 : les jetons et consentements ont leur propre table", () => {
    expect(provider()?.options?.schema?.oauthAccessToken?.modelName).toBe("oauthProviderAccessToken");
    expect(provider()?.options?.schema?.oauthConsent?.modelName).toBe("oauthProviderConsent");
  });

  it("n'installe plus de hook before (l'ancien forceur de consentement)", () => {
    const opts = buildAuthOptions(env) as { hooks?: unknown };
    expect(opts.hooks).toBeUndefined();
  });
});

describe("mcpResourceUrl", () => {
  it("ajoute /api/mcp et ignore les barres finales de SITE_URL", () => {
    expect(mcpResourceUrl("https://netereka.ci")).toBe("https://netereka.ci/api/mcp");
    expect(mcpResourceUrl("https://netereka.ci/")).toBe("https://netereka.ci/api/mcp");
  });
});
