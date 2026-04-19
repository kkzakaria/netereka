import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/guards";
import { isAiFeatureEnabled } from "@/lib/ai/client";
import { AiNewClient } from "./ai-new-client";

export default async function AiNewProductPage() {
  await requireAdmin();
  const { env } = await getCloudflareContext({ async: true });
  if (!isAiFeatureEnabled(env)) notFound();

  return <AiNewClient />;
}
