import { getCloudflareContext } from "@opennextjs/cloudflare";

export const TEXT_MODEL = "qwen/qwen3.5-397b-a17b" as const;
export const IMAGE_MODEL =
  "@cf/stabilityai/stable-diffusion-xl-base-1.0" as const;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "OpenRouterApiError";
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
    signal: AbortSignal.timeout(30_000),
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
    throw new OpenRouterApiError(0, `OpenRouter returned non-JSON body: ${parseErr}`);
  }

  if (!data.choices?.length) {
    throw new OpenRouterApiError(0, `OpenRouter returned empty choices array (model=${TEXT_MODEL})`);
  }

  const content = data.choices[0]?.message?.content;
  if (content == null) {
    throw new OpenRouterApiError(
      0,
      `OpenRouter returned null content (model=${TEXT_MODEL}, finish_reason=${data.choices[0]?.finish_reason ?? "unknown"})`
    );
  }

  return content;
}
