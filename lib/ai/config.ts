import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { aiConfig } from "@/lib/db/schema";

export interface AiSettings {
  apiKey: string | null;
  braveApiKey: string | null;
  model: string | null;
  enabled: boolean;
}

/**
 * Resolves AI settings with a DB-first + env-var-fallback strategy.
 *
 * - `apiKey` and `model`: DB row column wins when truthy (non-null and non-empty);
 *   otherwise the env var; otherwise null.
 * - `enabled`: DIFFERENT semantics. If any DB row exists, its `enabled` column
 *   is the source of truth (0=false, 1=true) — even when set to 0, which
 *   overrides AI_PRODUCT_CREATION_ENABLED="1" in env. The env is consulted
 *   only when no row exists at all (default-on, disabled only on "0").
 *
 * On DB read failure (table missing, transient D1 error), gracefully degrades
 * to env-only resolution and logs the error. This preserves the previous
 * env-only robustness contract and immunizes call sites against deploy/migration
 * ordering issues.
 */
export async function getAiSettings(): Promise<AiSettings> {
  const { env } = await getCloudflareContext({ async: true });

  let row: typeof aiConfig.$inferSelect | undefined;
  try {
    const db = await getDrizzle();
    row = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();
  } catch (error) {
    console.error("[ai/config] getAiSettings DB read failed, falling back to env:", error);
  }

  const dbKey = row?.anthropic_api_key || null;
  const dbBraveKey = row?.brave_api_key || null;
  const dbModel = row?.model || null;

  return {
    apiKey: dbKey || env.ANTHROPIC_API_KEY || null,
    braveApiKey: dbBraveKey || env.BRAVE_API_KEY || null,
    model: dbModel || env.AI_MODEL || null,
    enabled: row
      ? row.enabled === 1
      : env.AI_PRODUCT_CREATION_ENABLED !== "0",
  };
}
