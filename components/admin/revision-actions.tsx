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
 *
 * § 2.5 du spec : appliquer une révision passe les autres révisions
 * `pending` de la même cible en `superseded`, « et l'écran le dit ». Deux
 * moments distincts pour le dire : `otherPendingCount` (calculé par la page
 * AVANT que l'administrateur ne clique, sur `listPendingRevisions`) prévient
 * de ce qui va se passer ; le toast, après coup, confirme ce qui a
 * réellement été remplacé (`result.supersededCount`, renvoyé par
 * `applyRevision`) — les deux peuvent différer d'une unité si une révision
 * a été déposée ou résolue entre l'affichage de la page et le clic.
 */
export function RevisionActions({
  revisionId,
  otherPendingCount = 0,
}: {
  revisionId: string;
  otherPendingCount?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleApply() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyRevisionAction(revisionId);
        if (result.success) {
          const n = result.supersededCount ?? 0;
          toast.success(
            n > 0
              ? `Révision appliquée — ${n} autre${n > 1 ? "s" : ""} proposition${n > 1 ? "s" : ""} sur cette fiche remplacée${n > 1 ? "s" : ""}.`
              : "Révision appliquée",
          );
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
    <div className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t bg-background/95 p-4 backdrop-blur">
      {otherPendingCount > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {otherPendingCount === 1
            ? "1 autre révision est en attente sur cette même fiche : appliquer celle-ci la remplacera."
            : `${otherPendingCount} autres révisions sont en attente sur cette même fiche : appliquer celle-ci les remplacera.`}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
    </div>
  );
}
