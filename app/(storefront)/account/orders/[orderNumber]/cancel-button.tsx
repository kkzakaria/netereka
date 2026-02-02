"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelOrderAction } from "./actions";
import { toast } from "sonner";

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
        Annuler la commande
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelOrderAction(orderNumber);
            if (result.success) {
              toast.success("Commande annulée");
              setConfirming(false);
            } else {
              toast.error(result.error ?? "Erreur");
            }
          })
        }
      >
        {pending ? "Annulation..." : "Confirmer l'annulation"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
        Non
      </Button>
    </div>
  );
}
