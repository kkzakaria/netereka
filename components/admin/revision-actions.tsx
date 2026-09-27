"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyRevisionAction, rejectRevisionAction } from "@/actions/admin/revisions";

/**
 * Barre d'action de l'écran de validation : appliquer ou rejeter.
 *
 * Le bouton Appliquer reste actif quels que soient les écarts à la charte
 * affichés par `RevisionDiff` — `checkDesignConformance` avertit, ne bloque
 * jamais (§ 2.2 du spec).
 *
 * Un conflit (`RevisionError("conflict")`, lib/db/revisions.ts) renvoie un
 * message écrit pour un humain — invitant à redemander une proposition
 * fraîche — affiché tel quel, jamais remplacé par une erreur générique.
 */
export function RevisionActions({ revisionId }: { revisionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleApply() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyRevisionAction(revisionId);
        if (result.success) {
          toast.success("Révision appliquée");
          router.push("/revisions");
          router.refresh();
        } else {
          setError(result.error || "Erreur lors de l'application de la révision.");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await rejectRevisionAction(revisionId);
        if (result.success) {
          toast.success("Révision rejetée");
          router.push("/revisions");
          router.refresh();
        } else {
          setError(result.error || "Erreur lors du rejet de la révision.");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t bg-background/95 p-4 backdrop-blur sm:flex-row sm:items-center">
      {error && (
        <p role="alert" className="text-sm text-destructive sm:flex-1">
          {error}
        </p>
      )}
      <div className="flex gap-3 sm:ml-auto">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11 flex-1 sm:flex-none"
          disabled={isPending}
          onClick={handleReject}
        >
          Rejeter
        </Button>
        <Button
          type="button"
          size="lg"
          className="min-h-11 flex-1 sm:flex-none"
          disabled={isPending}
          onClick={handleApply}
        >
          Appliquer
        </Button>
      </div>
    </div>
  );
}
