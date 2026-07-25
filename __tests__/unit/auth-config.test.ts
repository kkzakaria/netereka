import { describe, it, expect } from "vitest";
import { buildAuthOptions } from "@/lib/auth/index";

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
