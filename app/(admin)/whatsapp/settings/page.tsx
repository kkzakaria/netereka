import { getWhatsAppConfig } from "@/actions/admin/whatsapp";
import { WhatsAppConfigForm } from "@/components/admin/whatsapp/whatsapp-config-form";

export default async function WhatsAppSettingsPage() {
  const config = await getWhatsAppConfig();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration WhatsApp</h1>
        <p className="text-muted-foreground">
          Configurez la connexion à l&apos;API WhatsApp Cloud de Meta.
        </p>
      </div>
      <WhatsAppConfigForm config={config} />
    </div>
  );
}
