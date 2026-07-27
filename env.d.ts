interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
  ASSETS: Fetcher;

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

  // Bearer secret required to invoke /api/cron/reap-pending-orders. This
  // route is not currently wired to any automatic scheduler (see that
  // route's comment) — it exists so the stale-pending-order sweep can be
  // triggered by whatever mechanism is chosen (a companion Worker's cron
  // trigger, a scheduled CI job, or manual ops action) without exposing it
  // unauthenticated.
  CRON_SECRET?: string;

  // Email (Resend)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string; // defaults to "NETEREKA <commandes@netereka.ci>"

  // AI-powered product creation
  ANTHROPIC_API_KEY: string;
  // Brave Search API key for image_search tool. Optional — if absent, the AI
  // generation falls back to image_candidates: [] and admin uploads images manually.
  BRAVE_API_KEY?: string;
  // "0" disables the feature (button hidden, /products/ai-new returns 404). Any other value or unset = enabled.
  AI_PRODUCT_CREATION_ENABLED?: string;
  // Optional model override (for rolling to newer Anthropic model IDs without a code change)
  AI_MODEL?: string;
}
