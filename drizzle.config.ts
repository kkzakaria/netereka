import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function getLocalD1Path(): string {
  const d1Dir = path.join(".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

  if (!fs.existsSync(d1Dir)) {
    console.error(
      "Local D1 directory not found. Run `npx wrangler d1 execute netereka-db --local --command \"SELECT 1\"` first."
    );
    process.exit(1);
  }

  const entries = fs.readdirSync(d1Dir);
  const sqliteFile = entries.find((e) => e.endsWith(".sqlite"));

  if (!sqliteFile) {
    console.error("No SQLite file found in local D1 directory.");
    process.exit(1);
  }

  return path.join(d1Dir, sqliteFile);
}

// Remote D1 via HTTP API (set CLOUDFLARE_D1_* env vars)
const isRemote =
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_DATABASE_ID &&
  process.env.CLOUDFLARE_D1_TOKEN;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(isRemote
    ? {
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
          token: process.env.CLOUDFLARE_D1_TOKEN!,
        },
      }
    : {
        dbCredentials: {
          url: getLocalD1Path(),
        },
      }),
});
