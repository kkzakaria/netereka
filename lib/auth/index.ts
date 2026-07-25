import { betterAuth, type BetterAuthOptions } from "better-auth";
import { captcha, emailOTP, admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { sendEmail } from "@/lib/notifications/email";
import { otpEmail } from "@/lib/notifications/templates";
import { getKV } from "@/lib/cloudflare/context";

// Cloudflare KV rejects expirationTtl below 60s (400 "Expiration TTL must be
// at least 60"). better-auth's own default rate-limit window for
// sign-in/sign-up-family paths not covered by customRules is 10s, so a
// literal pass-through would throw on every social sign-in / password /
// email-change attempt. Floor every write at KV's minimum instead of trusting
// the caller's TTL.
const KV_MIN_TTL_SECONDS = 60;

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
      // is trivially bypassed. secondaryStorage (below) backs this with KV.
      storage: "secondary-storage",
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

    // secondaryStorage is also better-auth's session/verification cache, not
    // just a rate-limit backend (confirmed in
    // node_modules/better-auth/dist/db/internal-adapter.mjs): once it's
    // defined, session and OTP-verification writes skip the D1 write
    // entirely unless storeSessionInDatabase / storeInDatabase are set,
    // making KV the sole store for both. KV is only eventually consistent
    // across edge locations, which is unsafe for state checked on every
    // request. storeSessionInDatabase/storeInDatabase keep D1 as the
    // source of truth — secondaryStorage becomes a cache in front of it
    // (findSession falls back to D1 on a KV miss) — so only the rate
    // limiter's behaviour changes here, not session or OTP handling.
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
      storeSessionInDatabase: true,
    },
    verification: {
      storeInDatabase: true,
    },
    secondaryStorage: {
      get: async (key: string) => {
        const kv = await getKV();
        return (await kv.get(key)) ?? null;
      },
      set: async (key: string, value: string, ttl?: number) => {
        const kv = await getKV();
        const expirationTtl = Math.max(ttl ?? KV_MIN_TTL_SECONDS, KV_MIN_TTL_SECONDS);
        await kv.put(key, value, { expirationTtl });
      },
      delete: async (key: string) => {
        const kv = await getKV();
        await kv.delete(key);
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
