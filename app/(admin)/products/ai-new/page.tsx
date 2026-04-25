import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { isAiFeatureEnabled } from "@/lib/ai/client";
import { AiNewClient } from "./ai-new-client";

export default async function AiNewProductPage() {
  await requireAdmin();
  if (!(await isAiFeatureEnabled())) notFound();

  return <AiNewClient />;
}
