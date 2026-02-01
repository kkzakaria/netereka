import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB() {
  const { env } = await getCloudflareContext();
  return env.DB;
}

export async function getKV() {
  const { env } = await getCloudflareContext();
  return env.KV;
}

export async function getR2() {
  const { env } = await getCloudflareContext();
  return env.R2;
}
