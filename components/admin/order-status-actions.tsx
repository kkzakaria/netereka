"use client";

import { useState, useTransition, useRef } from "react";
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
  ORDER_STATUS_LABELS,
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
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus as OrderStatus] || [];

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune action disponible pour ce statut.
      </p>
    );
  }

  function openDialog(action: string, buttonElement: HTMLButtonElement) {
    triggerRef.current = buttonElement;
    setDialogAction(action);
    setNote("");
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    // Return focus to trigger button when dialog closes
    if (!open && triggerRef.current) {
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
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
        const newStatusLabel = ORDER_STATUS_LABELS[dialogAction as OrderStatus] || dialogAction;
        setStatusAnnouncement(`Statut mis à jour vers ${newStatusLabel}`);
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
      {/* Screen reader announcement for status updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

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
            onClick={(e) => openDialog(status, e.currentTarget)}
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
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
              onClick={() => handleDialogClose(false)}
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
