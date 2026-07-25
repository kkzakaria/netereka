import { describe, it, expect } from "vitest";
import { buildAuthOptions, CAPTCHA_ENDPOINTS } from "@/lib/auth/index";

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
  });

  it("wires the constant into the captcha plugin's endpoint list", () => {
    const opts = buildAuthOptions(env);
    const captchaPlugin = opts.plugins?.find((p) => p.id === "captcha");
    const endpoints = (captchaPlugin as { options?: { endpoints?: string[] } })?.options?.endpoints;

    expect(endpoints).toEqual([...CAPTCHA_ENDPOINTS]);
  });
});
