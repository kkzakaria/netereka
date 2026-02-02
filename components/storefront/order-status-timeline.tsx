import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/db/types";

const steps: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Confirmée" },
  { key: "preparing", label: "Préparation" },
  { key: "shipping", label: "Livraison" },
  { key: "delivered", label: "Livrée" },
];

const stepIndex: Record<string, number> = {};
steps.forEach((s, i) => (stepIndex[s.key] = i));

export function OrderStatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center text-sm text-destructive">
        Commande annulée
      </div>
    );
  }

  const currentIdx = stepIndex[status] ?? 0;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isDone = i <= currentIdx;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    i <= currentIdx ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              <div
                className={cn(
                  "size-3 shrink-0 rounded-full border-2",
                  isDone
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 bg-background"
                )}
              />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    i < currentIdx ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-center text-[10px] leading-tight",
                isDone ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
