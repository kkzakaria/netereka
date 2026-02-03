"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PrinterIcon, ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useParams } from "next/navigation";

export function InvoicePrintButton() {
  const params = useParams();
  const orderId = params.id as string;

  return (
    <div className="flex gap-2">
      <Button variant="outline" asChild>
        <Link href={`/orders/${orderId}`}>
          <HugeiconsIcon icon={ArrowLeft02Icon} size={16} className="mr-2" />
          Retour
        </Link>
      </Button>
      <Button onClick={() => window.print()}>
        <HugeiconsIcon icon={PrinterIcon} size={16} className="mr-2" />
        Imprimer
      </Button>
    </div>
  );
}
