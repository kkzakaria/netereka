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
  const dbModel = row?.model || null;
  const envKey = env.ANTHROPIC_API_KEY || null;
  const envModel = env.AI_MODEL || null;

  return {
    apiKeyMask: dbKey ? maskKey(dbKey) : envKey ? maskKey(envKey) : null,
    apiKeyFromEnv: !dbKey && !!envKey,
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
    model: formData.get("model"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const db = await getDrizzle();
    const existing = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();

    // Detect "unchanged" by EXACT mask equality — gotcha from CLAUDE.md: startsWith("••")
    // would falsely match a legit key that happens to start with bullets.
    const expectedMask = existing?.anthropic_api_key ? maskKey(existing.anthropic_api_key) : null;
    const incomingKeyRaw = parsed.data.anthropic_api_key ?? "";

    let incomingKey: string | null;
    if (expectedMask !== null && incomingKeyRaw === expectedMask) {
      // Mask returned unchanged → preserve existing stored key
      incomingKey = existing!.anthropic_api_key;
    } else if (/^•{8}/.test(incomingKeyRaw)) {
      // Looks like a mask but doesn't match an existing stored key — most often the
      // env-fallback mask submitted as-is. Refuse rather than silently persist garbage.
      return {
        success: false,
        fieldErrors: {
          anthropic_api_key: [
            "Cette valeur ressemble à un masque (••••••••...). Saisissez une vraie clé API ou laissez vide pour la supprimer.",
          ],
        },
      };
    } else {
      incomingKey = incomingKeyRaw.trim() || null;
    }

    const incomingModel = parsed.data.model?.trim() || null;
    const enabledInt = parsed.data.enabled ? 1 : 0;
    const updated = nowIso();

    await db
      .insert(aiConfig)
      .values({
        id: 1,
        anthropic_api_key: incomingKey,
        model: incomingModel,
        enabled: enabledInt,
        updated_at: updated,
      })
      .onConflictDoUpdate({
        target: aiConfig.id,
        set: {
          anthropic_api_key: incomingKey,
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
