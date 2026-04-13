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

  if (variant === "icon") {
    return (
      <Button size="icon-sm" variant="outline" asChild aria-label={`Demander sur WhatsApp: ${productName}`}>
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          <HugeiconsIcon icon={WhatsappIcon} size={16} />
        </a>
      </Button>
    );
  }

  return (
    <Button variant="outline" className="w-full gap-2" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <HugeiconsIcon icon={WhatsappIcon} size={18} />
        Demander sur WhatsApp
      </a>
    </Button>
  );
}
