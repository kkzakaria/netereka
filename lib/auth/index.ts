import { betterAuth } from "better-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export async function initAuth() {
  if (authInstance) return authInstance;

  const { env } = await getCloudflareContext();
  const cfEnv = env as CloudflareEnv;

  authInstance = betterAuth({
    baseURL: cfEnv.SITE_URL,
    secret: cfEnv.BETTER_AUTH_SECRET,
    database: {
      type: "sqlite",
      db: cfEnv.DB,
    },
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
          required: false,
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
    session: {
      expiresIn: 7 * 24 * 60 * 60, // 7 days
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    trustedOrigins: [
      "https://appleid.apple.com",
    ],
  });

  return authInstance;
}
