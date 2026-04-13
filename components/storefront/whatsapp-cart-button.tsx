"use client";

import { useCartStore, selectCartSubtotal } from "@/stores/cart-store";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "2250700000000";

export function WhatsAppCartButton() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);

  if (items.length === 0) return null;

  const formattedTotal = new Intl.NumberFormat("fr-FR").format(subtotal);
  const itemLines = items
    .map(
      (i) =>
        `- ${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity} (${new Intl.NumberFormat("fr-FR").format(i.price * i.quantity)} FCFA)`
    )
    .join("\n");
  const message = `Bonjour, je souhaite commander :\n${itemLines}\nTotal : ${formattedTotal} FCFA`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
    >
      <HugeiconsIcon icon={WhatsappIcon} size={18} />
      Finaliser via WhatsApp
    </Button>
  );
}
