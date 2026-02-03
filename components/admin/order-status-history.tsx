import type { OrderStatusHistory as History } from "@/lib/db/types";
import { ORDER_STATUS_LABELS } from "@/lib/constants/orders";

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrderStatusHistoryProps {
  history: History[];
}

export function OrderStatusHistory({ history }: OrderStatusHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex gap-3 border-l-2 border-muted pl-3 pb-3"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {entry.from_status && (
                <>
                  <span className="text-muted-foreground">
                    {ORDER_STATUS_LABELS[entry.from_status as keyof typeof ORDER_STATUS_LABELS] || entry.from_status}
                  </span>
                  <span className="text-muted-foreground">→</span>
                </>
              )}
              <span className="font-medium">
                {ORDER_STATUS_LABELS[entry.to_status as keyof typeof ORDER_STATUS_LABELS] || entry.to_status}
              </span>
            </div>
            {entry.note && (
              <p className="text-xs text-muted-foreground">{entry.note}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {formatDateTime(entry.created_at)} par {entry.changed_by}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
