"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { aiConfig } from "@/lib/db/schema";
import { aiConfigSchema } from "@/lib/validations/ai-config";
import type { ActionResult } from "@/lib/utils";

export interface AiConfigView {
  apiKeyMask: string | null;
  apiKeyFromEnv: boolean;
  braveApiKeyMask: string | null;
  braveApiKeyFromEnv: boolean;
  model: string | null;
  modelFromEnv: boolean;
  enabled: boolean;
}

// Fixed 8 bullets (regardless of original key length) so the mask doesn't leak
// the real key length. The form copy at ai-config-form.tsx mirrors this number.
function maskKey(value: string): string {
  if (value.length <= 8) return "••••••••";
  return "••••••••" + value.slice(-4);
}

function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export async function getAiConfig(): Promise<AiConfigView> {
  await requireAdmin();
  const { env } = await getCloudflareContext({ async: true });

  let row: typeof aiConfig.$inferSelect | undefined;
  try {
    const db = await getDrizzle();
    row = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();
  } catch (error) {
    console.error("[admin/ai-config] getAiConfig DB read failed, falling back to env:", error);
  }

  const dbKey = row?.anthropic_api_key || null;
  const dbBraveKey = row?.brave_api_key || null;
  const dbModel = row?.model || null;
  const envKey = env.ANTHROPIC_API_KEY || null;
  const envBraveKey = env.BRAVE_API_KEY || null;
  const envModel = env.AI_MODEL || null;

  return {
    apiKeyMask: dbKey ? maskKey(dbKey) : envKey ? maskKey(envKey) : null,
    apiKeyFromEnv: !dbKey && !!envKey,
    braveApiKeyMask: dbBraveKey ? maskKey(dbBraveKey) : envBraveKey ? maskKey(envBraveKey) : null,
    braveApiKeyFromEnv: !dbBraveKey && !!envBraveKey,
    model: dbModel || envModel,
    modelFromEnv: !dbModel && !!envModel,
    enabled: row
      ? row.enabled === 1
      : env.AI_PRODUCT_CREATION_ENABLED !== "0",
  };
}

export async function saveAiConfig(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = aiConfigSchema.safeParse({
    anthropic_api_key: formData.get("anthropic_api_key"),
    brave_api_key: formData.get("brave_api_key"),
    model: formData.get("model"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const db = await getDrizzle();
    const existing = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();

    // Resolve a key field where the user may submit:
    //   - raw new value → store as-is
    //   - mask matching the EXACT current stored mask → preserve existing
    //   - mask not matching (env-fallback mask submitted blindly) → reject
    function resolveKey(
      raw: string,
      stored: string | null,
      fieldName: string,
    ): { ok: true; key: string | null } | { ok: false; error: string; fieldName: string } {
      const expectedMask = stored ? maskKey(stored) : null;
      if (expectedMask !== null && raw === expectedMask) return { ok: true, key: stored };
      if (/^•{8}/.test(raw)) {
        return {
          ok: false,
          fieldName,
          error: "Cette valeur ressemble à un masque (••••••••...). Saisissez une vraie clé API ou laissez vide pour la supprimer.",
        };
      }
      return { ok: true, key: raw.trim() || null };
    }

    const anthropicResolved = resolveKey(
      parsed.data.anthropic_api_key ?? "",
      existing?.anthropic_api_key ?? null,
      "anthropic_api_key",
    );
    if (!anthropicResolved.ok) {
      return { success: false, fieldErrors: { [anthropicResolved.fieldName]: [anthropicResolved.error] } };
    }
    const braveResolved = resolveKey(
      parsed.data.brave_api_key ?? "",
      existing?.brave_api_key ?? null,
      "brave_api_key",
    );
    if (!braveResolved.ok) {
      return { success: false, fieldErrors: { [braveResolved.fieldName]: [braveResolved.error] } };
    }
    const incomingKey = anthropicResolved.key;
    const incomingBraveKey = braveResolved.key;

    const incomingModel = parsed.data.model?.trim() || null;
    const enabledInt = parsed.data.enabled ? 1 : 0;
    const updated = nowIso();

    await db
      .insert(aiConfig)
      .values({
        id: 1,
        anthropic_api_key: incomingKey,
        brave_api_key: incomingBraveKey,
        model: incomingModel,
        enabled: enabledInt,
        updated_at: updated,
      })
      .onConflictDoUpdate({
        target: aiConfig.id,
        set: {
          anthropic_api_key: incomingKey,
          brave_api_key: incomingBraveKey,
          model: incomingModel,
          enabled: enabledInt,
          updated_at: updated,
        },
      });

    revalidatePath("/ai-settings");
    return { success: true };
  } catch (error) {
    console.error("[admin/ai-config] saveAiConfig error:", error);
    return {
      success: false,
      error: "Erreur lors de la sauvegarde de la configuration AI.",
    };
  }
}
