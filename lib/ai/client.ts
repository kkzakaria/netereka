// lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";

let cached: Anthropic | null = null;

export async function getAnthropicClient(): Promise<Anthropic> {
  if (cached) return cached;
  const { env } = await getCloudflareContext({ async: true });
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

export function isAiFeatureEnabled(env: CloudflareEnv): boolean {
  return env.AI_PRODUCT_CREATION_ENABLED !== "0";
}
