import { getCloudflareContext } from "@opennextjs/cloudflare";

export const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct" as const;
export const IMAGE_MODEL =
  "@cf/stabilityai/stable-diffusion-xl-base-1.0" as const;

export async function getAI() {
  const { env } = await getCloudflareContext();
  if (!env.AI) {
    throw new Error("Workers AI binding (AI) is not configured in wrangler.jsonc");
  }
  return env.AI;
}
