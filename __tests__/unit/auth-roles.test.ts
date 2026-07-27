import { describe, it, expect } from "vitest";
import { adminRole, superAdminRole, buildAuthOptions } from "@/lib/auth/index";

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

describe("role access control", () => {
  it("does not let the admin role change roles", () => {
    expect(adminRole.statements.user ?? []).not.toContain("set-role");
  });

  it("does not let the admin role set passwords, delete or impersonate users", () => {
    const userPerms = adminRole.statements.user ?? [];
    expect(userPerms).not.toContain("set-password");
    expect(userPerms).not.toContain("delete");
    expect(userPerms).not.toContain("impersonate");
  });

  it("reserves those capabilities for super_admin", () => {
    const userPerms = superAdminRole.statements.user ?? [];
    expect(userPerms).toContain("set-role");
    expect(userPerms).toContain("set-password");
  });

  it("still lets admin ban and list users", () => {
    const userPerms = adminRole.statements.user ?? [];
    expect(userPerms).toContain("list");
    expect(userPerms).toContain("ban");
  });

  // list-user-sessions / revoke-user-session / revoke-user-sessions
  // (admin.mjs routes.mjs) let the holder enumerate and revoke ANY user's
  // sessions, including a super_admin's — staff-management, not customer
  // moderation. Reserved for super_admin like the other staff-only grants.
  it("does not let the admin role list or revoke sessions", () => {
    const sessionPerms = adminRole.statements.session ?? [];
    expect(sessionPerms).not.toContain("list");
    expect(sessionPerms).not.toContain("revoke");
  });

  it("reserves session list/revoke for super_admin", () => {
    const sessionPerms = superAdminRole.statements.session ?? [];
    expect(sessionPerms).toContain("list");
    expect(sessionPerms).toContain("revoke");
  });

  // The vulnerable state was never a bad role object — adminRole/superAdminRole
  // above can both be correct while the plugin config still wires the wrong
  // one to "admin" (e.g. `admin: superAdminRole`). This pins the wiring
  // itself: admin.mjs (better-auth 1.6.25) returns the plugin's original
  // options object verbatim as `options` on the returned plugin, so the
  // exact role instances passed into admin({ roles: {...} }) are readable
  // back out and compared by reference — the same pattern
  // auth-config.test.ts uses for the captcha plugin's `endpoints` option.
  it("wires the reduced role to admin and the full role to super_admin in the plugin config", () => {
    const opts = buildAuthOptions(env);
    const adminPlugin = opts.plugins?.find((p) => p.id === "admin");
    const roles = (adminPlugin as { options?: { roles?: Record<string, unknown> } })?.options?.roles;

    expect(roles?.admin).toBe(adminRole);
    expect(roles?.super_admin).toBe(superAdminRole);
  });
});
