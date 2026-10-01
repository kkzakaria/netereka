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

  // Bearer secret required to invoke /api/cron/reap-pending-orders. Set to
  // the same value as the CRON_SECRET repository secret used by the
  // "Reap Pending Orders" GitHub Actions workflow, which calls this route on
  // a schedule.
  CRON_SECRET?: string;

  // Email (Resend)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string; // defaults to "NETEREKA <commandes@netereka.ci>"

  // AI-powered product creation
  ANTHROPIC_API_KEY: string;
  // Clé de l'API Brave Image Search, lue par lib/media/image-search.ts et
  // exposée par l'outil MCP `search_product_images`. Optionnelle : en son
  // absence l'outil répond un échec typé qui nomme ce secret, jamais une liste
  // vide. Le nom est celui du secret réellement posé en production (vérifié
  // par `npx wrangler secret list`) ; ne pas le renommer en `BRAVE_API_KEY`.
  BRAVE_SEARCH_API_KEY?: string;
  // "0" disables the feature (button hidden, /products/ai-new returns 404). Any other value or unset = enabled.
  AI_PRODUCT_CREATION_ENABLED?: string;
  // Optional model override (for rolling to newer Anthropic model IDs without a code change)
  AI_MODEL?: string;
}
