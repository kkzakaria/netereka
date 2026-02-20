interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  ASSETS: Fetcher;
  IMAGES: ImagesBinding;
  AI: Ai;

  // Auth (Better Auth)
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  APPLE_CLIENT_ID: string;
  APPLE_CLIENT_SECRET: string;
  SITE_URL: string;

  // Turnstile
  TURNSTILE_SECRET_KEY: string;

  // Email (Resend)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string; // defaults to "NETEREKA <commandes@netereka.ci>"

  // Search APIs (AI product specs enrichment — at least one recommended)
  BRAVE_SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_API_KEY?: string;    // Google Custom Search JSON API key
  GOOGLE_SEARCH_ENGINE_ID?: string;  // Programmable Search Engine cx identifier

  // OpenRouter (AI text generation)
  OPENROUTER_API_KEY?: string;
}
