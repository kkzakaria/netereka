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

  // Clé de l'API Brave Image Search, lue par lib/media/image-search.ts et
  // exposée par l'outil MCP `search_product_images`. Optionnelle : en son
  // absence l'outil répond un échec typé qui nomme ce secret, jamais une liste
  // vide. Le nom est celui du secret réellement posé en production (vérifié
  // par `npx wrangler secret list`) ; ne pas le renommer en `BRAVE_API_KEY`.
  BRAVE_SEARCH_API_KEY?: string;
  // Clé de l'API xAI (https://api.x.ai), lue par l'outil MCP
  // `generate_product_image` pour `grok-imagine-image-2.0` en mode édition.
  // Optionnelle, et ABSENTE du Worker de production au 2026-10-01 (vérifié par
  // `npx wrangler secret list`) : en son absence l'outil rend un échec typé qui
  // nomme ce secret, jamais une liste vide ni un silence.
  XAI_API_KEY?: string;
  // Plafond mensuel d'images générées (entier décimal, en nombre d'images).
  // ABSENT ⇒ LA GÉNÉRATION REFUSE. Ce n'est pas un oubli : `grok-imagine` est
  // facturé à l'image, et sur une dépense par appel l'absence de borne est le
  // pire comportement par défaut. Une valeur non décidée doit se lire « pas
  // décidé », pas « illimité ». `0` désactive explicitement la génération, ce
  // qui est différent de ne pas avoir tranché.
  AI_IMAGE_MONTHLY_LIMIT?: string;
}
