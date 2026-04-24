// lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";
import { getAiSettings } from "@/lib/ai/config";

/**
 * Returns a configured Anthropic client. Not cached module-level so that
 * admin changes to the API key are picked up on the next call.
 */
export async function getAnthropicClient(): Promise<Anthropic> {
  const { apiKey } = await getAiSettings();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({
    apiKey,
    maxRetries: 3, // handles 408/409/429/5xx with exponential backoff
  });
}

export async function isAiFeatureEnabled(): Promise<boolean> {
  const { enabled } = await getAiSettings();
  return enabled;
}
