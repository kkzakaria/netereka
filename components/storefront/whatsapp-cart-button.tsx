"use client";

import { useCartStore, selectCartSubtotal } from "@/stores/cart-store";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { useWhatsAppNumber } from "@/components/storefront/whatsapp-number-provider";

export function WhatsAppCartButton() {
  const whatsappNumber = useWhatsAppNumber();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);

  if (!whatsappNumber || items.length === 0) return null;

  const formattedTotal = new Intl.NumberFormat("fr-FR").format(subtotal);
  const itemLines = items
    .map(
      (i) =>
        `- ${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity} (${new Intl.NumberFormat("fr-FR").format(i.price * i.quantity)} FCFA)`
    )
    .join("\n");
  const message = `Bonjour, je souhaite commander :\n${itemLines}\nTotal : ${formattedTotal} FCFA`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <button
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      className="w-full rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#20BD5A] active:bg-[#1DA851] flex items-center justify-center gap-2"
    >
      <HugeiconsIcon icon={WhatsappIcon} size={18} />
      Commander sur WhatsApp
    </button>
  );
}
