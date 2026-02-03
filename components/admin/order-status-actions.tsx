"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  updateOrderStatus,
  cancelOrderAdmin,
  processReturn,
} from "@/actions/admin/orders";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_ACTION_LABELS,
} from "@/lib/constants/orders";
import type { OrderStatus } from "@/lib/db/types";

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusActions({
  orderId,
  currentStatus,
}: OrderStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus as OrderStatus] || [];

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune action disponible pour ce statut.
      </p>
    );
  }

  function openDialog(action: string) {
    setDialogAction(action);
    setNote("");
    setDialogOpen(true);
  }

  function handleAction() {
    if (!dialogAction) return;

    startTransition(async () => {
      let result;

      if (dialogAction === "cancelled") {
        result = await cancelOrderAdmin(orderId, note, true);
      } else if (dialogAction === "returned") {
        result = await processReturn(orderId, note);
      } else {
        result = await updateOrderStatus(orderId, dialogAction, note);
      }

      if (result.success) {
        toast.success("Statut mis à jour");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const isDestructiveAction =
    dialogAction === "cancelled" || dialogAction === "returned";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {allowed.map((status) => (
          <Button
            key={status}
            variant={
              status === "cancelled" || status === "returned"
                ? "outline"
                : "default"
            }
            size="sm"
            onClick={() => openDialog(status)}
            disabled={isPending}
            className={
              status === "cancelled" || status === "returned"
                ? "text-destructive hover:text-destructive"
                : ""
            }
          >
            {ORDER_STATUS_ACTION_LABELS[status] || status}
          </Button>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction && ORDER_STATUS_ACTION_LABELS[dialogAction]}
            </DialogTitle>
            <DialogDescription>
              {isDestructiveAction
                ? "Cette action est irréversible. Le stock sera remboursé."
                : "Vous pouvez ajouter une note optionnelle."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="note">
              {isDestructiveAction ? "Raison" : "Note (optionnel)"}
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isDestructiveAction
                  ? "Raison de l'annulation ou du retour..."
                  : "Ajouter une note..."
              }
              required={isDestructiveAction}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant={isDestructiveAction ? "destructive" : "default"}
              onClick={handleAction}
              disabled={isPending || (isDestructiveAction && !note.trim())}
            >
              {isPending ? "Chargement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
