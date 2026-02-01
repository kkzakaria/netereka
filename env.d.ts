interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  ASSETS: Fetcher;

  // Auth
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  APPLE_CLIENT_ID: string;
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_PRIVATE_KEY: string;
  SITE_URL: string;

  // Turnstile
  TURNSTILE_SECRET_KEY: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: string;
}
