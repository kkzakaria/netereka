import { HugeiconsIcon } from "@hugeicons/react";
import { Truck, Shield, Headset } from "@hugeicons/core-free-icons";

const BADGES = [
  {
    icon: Truck,
    title: "Livraison en CI",
    description: "Livraison à Abidjan et environs",
  },
  {
    icon: Shield,
    title: "Paiement à la livraison",
    description: "Payez en espèces à la réception",
  },
  {
    icon: Headset,
    title: "Support 7j/7",
    description: "Assistance par WhatsApp",
  },
];

export function TrustBadges() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {BADGES.map((badge) => (
        <div
          key={badge.title}
          className="flex items-start gap-3 rounded-xl border bg-card p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={badge.icon} size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">{badge.title}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
