import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { aiConfig } from "@/lib/db/schema";

export interface AiSettings {
  apiKey: string | null;
  model: string | undefined;
  enabled: boolean;
}

/**
 * Resolves AI settings with a DB-first + env-var-fallback strategy.
 *
 * DB row columns override env vars when non-null and non-empty. If the DB row
 * is absent entirely, env-var semantics are preserved (default-on, disabled
 * only if AI_PRODUCT_CREATION_ENABLED="0").
 */
export async function getAiSettings(): Promise<AiSettings> {
  const db = await getDrizzle();
  const row = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();
  const { env } = await getCloudflareContext({ async: true });

  const dbKey = row?.anthropic_api_key || null;
  const dbModel = row?.model || null;

  return {
    apiKey: dbKey || env.ANTHROPIC_API_KEY || null,
    model: dbModel || env.AI_MODEL || undefined,
    enabled: row
      ? row.enabled === 1
      : env.AI_PRODUCT_CREATION_ENABLED !== "0",
  };
}
