import { getCloudflareContext } from "@opennextjs/cloudflare";

export const TEXT_MODEL = "qwen/qwen3.5-397b-a17b" as const;
export const IMAGE_MODEL =
  "@cf/stabilityai/stable-diffusion-xl-base-1.0" as const;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_TIMEOUT_MS = 90_000;

export class OpenRouterApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "OpenRouterApiError";
    Object.setPrototypeOf(this, OpenRouterApiError.prototype); // required for ES2017 target
  }
}

export async function getAI() {
  const { env } = await getCloudflareContext();
  if (!env.AI) {
    throw new Error("Workers AI binding (AI) is not configured in wrangler.jsonc");
  }
  return env.AI;
}

export async function callTextModel(system: string, user: string): Promise<string> {
  const { env } = await getCloudflareContext();
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://netereka.ci",
      "X-Title": "NETEREKA Admin",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new OpenRouterApiError(
      response.status,
      `OpenRouter API error ${response.status}: ${errorText}`
    );
  }

  let data: { choices: Array<{ finish_reason?: string; message?: { content: string | null } }> };
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new Error(`OpenRouter returned non-JSON response body (model=${TEXT_MODEL}): ${parseErr}`);
  }

  if (!data.choices?.length) {
    throw new Error(`OpenRouter returned empty choices (model=${TEXT_MODEL}). This may indicate a content filter hit.`);
  }

  const content = data.choices[0]?.message?.content;
  if (content == null) {
    throw new Error(
      `OpenRouter returned null content (model=${TEXT_MODEL}, finish_reason=${data.choices[0]?.finish_reason ?? "unknown"})`
    );
  }

  return content;
}
