import { getWhatsAppStats } from "@/actions/admin/whatsapp";
import { WhatsAppAnalytics } from "@/components/admin/whatsapp/whatsapp-analytics";

export default async function WhatsAppAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period =
    params.period === "7d" || params.period === "90d"
      ? params.period
      : "30d";
  const stats = await getWhatsAppStats(period as "7d" | "30d" | "90d");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics WhatsApp</h1>
        <p className="text-muted-foreground">
          Performances du canal WhatsApp
        </p>
      </div>
      <WhatsAppAnalytics stats={stats} currentPeriod={period} />
    </div>
  );
}
