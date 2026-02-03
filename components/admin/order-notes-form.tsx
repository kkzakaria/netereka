"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateInternalNotes } from "@/actions/admin/orders";

interface OrderNotesFormProps {
  orderId: string;
  initialNotes: string | null;
}

export function OrderNotesForm({ orderId, initialNotes }: OrderNotesFormProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(true);

  function handleChange(value: string) {
    setNotes(value);
    setIsSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateInternalNotes(orderId, notes);
      if (result.success) {
        toast.success("Notes enregistrées");
        setIsSaved(true);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Notes internes (non visibles par le client)..."
        className="min-h-24"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isSaved ? "Sauvegardé" : "Modifications non enregistrées"}
        </span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending || isSaved}
        >
          {isPending ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
}
