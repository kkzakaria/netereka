"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WhatsAppStats } from "@/actions/admin/whatsapp";

type Period = "7d" | "30d" | "90d";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface WhatsAppAnalyticsProps {
  stats: WhatsAppStats;
  currentPeriod: string;
}

export function WhatsAppAnalytics({
  stats,
  currentPeriod,
}: WhatsAppAnalyticsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePeriodChange(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant={currentPeriod === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Row 1: Conversations */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Conversations
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Total conversations"
            value={stats.conversations.total}
          />
          <MetricCard
            title="Conversations actives"
            value={stats.conversations.active}
          />
          <MetricCard
            title="Conversations escaladées"
            value={stats.conversations.escalated}
          />
        </div>
      </div>

      {/* Row 2: Messages */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Messages
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard title="Total messages" value={stats.messages.total} />
          <MetricCard
            title="Messages entrants"
            value={stats.messages.inbound}
          />
          <MetricCard
            title="Messages sortants"
            value={stats.messages.outbound}
          />
        </div>
      </div>

      {/* Row 3: Orders comparison */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Commandes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            title="Commandes WhatsApp"
            value={stats.orders.whatsapp_count}
            subtitle={formatPrice(stats.orders.whatsapp_revenue)}
          />
          <MetricCard
            title="Commandes Web"
            value={stats.orders.web_count}
            subtitle={formatPrice(stats.orders.web_revenue)}
          />
        </div>
      </div>
    </div>
  );
}
