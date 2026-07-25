import { betterAuth, type BetterAuthOptions } from "better-auth";
import { captcha, emailOTP, admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { sendEmail } from "@/lib/notifications/email";
import { otpEmail } from "@/lib/notifications/templates";

// ACL for the better-auth admin plugin — mirrors the library's defaultStatements.
// Required to declare super_admin, agent, and customer as known roles so the
// plugin's hasPermission() check can resolve them (defaultRoles only knows "admin" + "user").
const adminStatements = {
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
} as const;
const ac = createAccessControl(adminStatements);
const staffRole = ac.newRole({ user: [...adminStatements.user], session: [...adminStatements.session] });
const noPermsRole = ac.newRole({ user: [], session: [] });

// better-auth's captcha plugin defaults to only
// ["/sign-up/email", "/sign-in/email", "/request-password-reset"]
// (better-auth/dist/plugins/captcha/constants.mjs). This app's forgot-password
// and email-verification-resend flows both go through the email-otp plugin
// instead (authClient.emailOtp.sendVerificationOtp -> POST
// /email-otp/send-verification-otp), which the default list misses entirely —
// every OTP send was reachable without a captcha token.
//
// The plugin matches with `pathname.includes(endpoint)` — a substring test,
// not an exact path match like rateLimit.customRules uses. That changes how
// "/forget-password" behaves here versus in the rate-limit config: as an
// exact route it does not exist in 1.6.25 (rateLimit.customRules deliberately
// has no rule for it, see below), but as a substring it also matches
// "/forget-password/email-otp" — a deprecated-but-still-mounted endpoint
// (email-otp/routes.mjs: forgetPasswordEmailOTP) that does send an email.
// NETEREKA's UI never calls it, but nothing stops a direct POST to it, so the
// entry is kept intentionally as defense-in-depth for that legacy route, not
// copied blindly.
export const CAPTCHA_ENDPOINTS = [
  "/sign-up/email",
  "/sign-in/email",
  "/forget-password",
  "/request-password-reset",
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
] as const;

// Extracted from initAuth() so the options literal can be asserted in unit
// tests without instantiating a Cloudflare runtime (getCloudflareContext()
// only resolves inside a Workers request context). Pure function of cfEnv —
// no behaviour change versus the previous inline object literal.
export function buildAuthOptions(cfEnv: CloudflareEnv) {
  const db = new Kysely({ dialect: new D1Dialect({ database: cfEnv.DB }) });

  return {
    baseURL: cfEnv.SITE_URL,
    secret: cfEnv.BETTER_AUTH_SECRET,
    database: { db, type: "sqlite" },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },

    // Implicit linking would let an OAuth sign-in merge into a pre-existing
    // local account on the strength of the provider's "verified" email claim
    // alone. Linking must instead go through an authenticated /link-social call.
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: [],
        allowDifferentEmails: false,
      },
    },

    socialProviders: {
      google: {
        clientId: cfEnv.GOOGLE_CLIENT_ID,
        clientSecret: cfEnv.GOOGLE_CLIENT_SECRET,
      },
      facebook: {
        clientId: cfEnv.FACEBOOK_APP_ID,
        clientSecret: cfEnv.FACEBOOK_APP_SECRET,
      },
      apple: {
        clientId: cfEnv.APPLE_CLIENT_ID,
        clientSecret: cfEnv.APPLE_CLIENT_SECRET,
      },
    },
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
    // better-auth derives the rate-limit key from the first token of
    // X-Forwarded-For by default, and Cloudflare appends to that header
    // instead of replacing it — so the client controls the leftmost value.
    // CF-Connecting-IP is set by the edge and cannot be spoofed by the client.
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      // The default storage is a Map per Worker isolate: counters survive
      // neither isolate recycling nor sharing across isolates, so the limit
      // is trivially bypassed. "database" persists counters in D1's
      // rateLimit table (lib/db/schema.ts) instead, via better-auth's Kysely
      // adapter — the only backend with an atomic consume in 1.6.25
      // (createDatabaseStorageWrapper's conditional incrementOne). The
      // alternative "secondary-storage" backend falls through to a
      // non-atomic check-then-write path without a custom `increment`, so it
      // was rejected: session/verification records also live in
      // secondaryStorage once configured, and KV's eventual consistency is
      // unsafe for state checked on every request.
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/email-otp/send-verification-otp": { window: 60, max: 3 },
        // NOTE: no rule for "/forget-password" — better-auth 1.6.25 has no
        // such route (verified against node_modules/better-auth/dist). The
        // forgot-password page (app/(auth)/auth/forgot-password) calls
        // authClient.emailOtp.sendVerificationOtp, which posts to
        // "/email-otp/send-verification-otp" — already rate-limited above.
      },
    },

    session: {
      expiresIn: 7 * 24 * 60 * 60,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    plugins: [
      admin({
        defaultRole: "customer",
        adminRoles: ["admin", "super_admin"],
        roles: {
          admin: staffRole,
          super_admin: staffRole,
          agent: noPermsRole,
          customer: noPermsRole,
        },
      }),
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: cfEnv.TURNSTILE_SECRET_KEY,
        endpoints: [...CAPTCHA_ENDPOINTS],
      }),
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === "sign-in") {
            // sign-in via OTP is not supported on NETEREKA — email/password only
            console.warn(`[auth] sendVerificationOTP called with type="sign-in" — not supported, skipping`);
            return;
          }
          const { subject, html } = otpEmail({
            otp,
            type: type as "email-verification" | "forget-password",
          });
          const result = await sendEmail({ to: email, subject, html, from: "NETEREKA <noreply@netereka.ci>" });
          if (!result.success) {
            // Throw so better-auth returns an error to the client — the OTP must not be
            // considered sent if the email was not delivered (sendEmail already logs the error).
            throw new Error(`Failed to send OTP email (type=${type}): ${result.error}`);
          }
        },
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
      }),
    ],
    trustedOrigins: [
      "https://appleid.apple.com",
    ],
  } satisfies BetterAuthOptions;
}

export async function initAuth() {
  const { env } = await getCloudflareContext();
  const cfEnv = env as CloudflareEnv;

  return betterAuth(buildAuthOptions(cfEnv));
}

export type Auth = Awaited<ReturnType<typeof initAuth>>;
export type Session = Auth["$Infer"]["Session"];
