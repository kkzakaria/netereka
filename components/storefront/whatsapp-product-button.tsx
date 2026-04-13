"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "2250700000000";

interface Props {
  productName: string;
  price: number;
  slug: string;
  variant?: "icon" | "full";
}

export function WhatsAppProductButton({ productName, price, slug, variant = "icon" }: Props) {
  const formattedPrice = new Intl.NumberFormat("fr-FR").format(price);
  const message = `Bonjour, je suis intéressé par *${productName}* (${formattedPrice} FCFA). Ref: ${slug}`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (variant === "icon") {
    return (
      <Button size="icon-lg" variant="outline" onClick={handleClick} aria-label={`Commander sur WhatsApp: ${productName}`} className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10">
        <HugeiconsIcon icon={WhatsappIcon} size={18} />
      </Button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-xl border-2 border-[#25D366] bg-transparent py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/10 flex items-center justify-center gap-2"
    >
      <HugeiconsIcon icon={WhatsappIcon} size={18} />
      Commander sur WhatsApp
    </button>
  );
}
