import { betterAuth } from "better-auth";
import { captcha, emailOTP } from "better-auth/plugins";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { sendEmail } from "@/lib/notifications/email";
import { otpEmail } from "@/lib/notifications/templates";

export async function initAuth() {
  const { env } = await getCloudflareContext();
  const cfEnv = env as CloudflareEnv;

  const db = new Kysely({ dialect: new D1Dialect({ database: cfEnv.DB }) });

  return betterAuth({
    baseURL: cfEnv.SITE_URL,
    secret: cfEnv.BETTER_AUTH_SECRET,
    database: { db, type: "sqlite" },
    emailAndPassword: {
      enabled: true,
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
          required: true,
          input: true,
        },
        role: {
          type: "string",
          required: false,
          input: false,
          defaultValue: "customer",
        },
      },
    },
    rateLimit: {
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/forgot-password": { window: 60, max: 3 },
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
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: cfEnv.TURNSTILE_SECRET_KEY,
      }),
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === "sign-in") return;
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
    ],
    trustedOrigins: [
      "https://appleid.apple.com",
    ],
  });
}

export type Auth = Awaited<ReturnType<typeof initAuth>>;
export type Session = Auth["$Infer"]["Session"];
