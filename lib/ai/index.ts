import { getCloudflareContext } from "@opennextjs/cloudflare";

export const TEXT_MODEL = "qwen/qwen3.5-397b-a17b" as const;
export const IMAGE_MODEL =
  "@cf/stabilityai/stable-diffusion-xl-base-1.0" as const;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

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
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0].message.content;
}
