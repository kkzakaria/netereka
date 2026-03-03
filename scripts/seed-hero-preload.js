#!/usr/bin/env node
// Seed the hero:lcp:preload-url KV key from the first active banner in D1.
// Called by deploy.yml after deployment so the homepage gets a Link preload header.
// Ongoing freshness is maintained by refreshHeroPreload() in actions/admin/banners.ts.

const { execFileSync } = require("child_process");

const R2_URL = process.env.NEXT_PUBLIC_R2_URL;
if (!R2_URL) {
  console.error("[seed-hero-preload] NEXT_PUBLIC_R2_URL is required");
  process.exit(1);
}

const wrangler = "./node_modules/.bin/wrangler";

// Query D1 for the first active banner with an image
let imageKey;
try {
  const output = execFileSync(
    wrangler,
    [
      "d1", "execute", "netereka-db", "--remote", "--json",
      "--command",
      "SELECT image_url FROM banners WHERE is_active=1 AND image_url IS NOT NULL AND (starts_at IS NULL OR starts_at <= datetime('now')) AND (ends_at IS NULL OR ends_at > datetime('now')) ORDER BY display_order ASC LIMIT 1",
    ],
    { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] }
  );
  imageKey = JSON.parse(output)?.[0]?.results?.[0]?.image_url;
} catch (e) {
  console.error("[seed-hero-preload] Failed to query D1:", e.message);
  process.exit(1);
}

if (!imageKey) {
  console.log("[seed-hero-preload] No active banner with image found — skipping KV seed");
  process.exit(0);
}

const r2Url = `${R2_URL}/${imageKey}`;
const cfUrl = (w) => `/cdn-cgi/image/width=${w},quality=75,format=auto/${r2Url}`;
// Simple preload without imagesrcset/imagesizes — Cloudflare Early Hints garbles
// multi-value imagesrcset, causing browsers to skip the preload entirely.
// width=640 matches what mobile browsers (DPR ~2-3, 44vw) actually request.
const linkValue = `<${cfUrl(640)}>; rel=preload; as=image; fetchpriority=high`;

try {
  execFileSync(
    wrangler,
    ["kv", "key", "put", "--remote", "--binding", "KV", "hero:lcp:preload-url", linkValue],
    { stdio: "inherit" }
  );
  console.log("[seed-hero-preload] KV seeded:", cfUrl(384).slice(0, 80) + "...");
} catch (e) {
  console.error("[seed-hero-preload] Failed to write KV:", e.message);
  process.exit(1);
}
