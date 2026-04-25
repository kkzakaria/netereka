import { getAiConfig } from "@/actions/admin/ai-config";
import { AiConfigForm } from "@/components/admin/ai/ai-config-form";

export const metadata = {
  title: "Configuration AI",
};

export default async function AiSettingsPage() {
  const config = await getAiConfig();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration AI</h1>
        <p className="text-muted-foreground">
          Paramètres de la création assistée par IA des fiches produits.
        </p>
      </div>
      <AiConfigForm config={config} />
    </div>
  );
}
