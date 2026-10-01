"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isWithdrawalConfirmed } from "@/lib/revisions/withdraw-confirmation";
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
 *
 * Une remise en ligne (§ 2.6 bis) n'a PAS de saisie : elle se voit, et un retrait la
 * corrige. Seul son libellé (`applyLabel`) la distingue d'un « Appliquer » anonyme.
 *
 * `withdrawal` (§ 2.6) : pour un retrait, le bouton ne s'active qu'une fois le
 * nom saisi. Ce champ est la moitié VISIBLE de la garantie : la saisie est
 * aussi envoyée à l'action, et `applyRevision` la vérifie elle-même.
 */
export function RevisionActions({
  revisionId,
  otherPendingCount = 0,
  withdrawal,
  applyLabel,
}: {
  revisionId: string;
  otherPendingCount?: number;
  withdrawal?: { targetName: string };
  /** Libellé du bouton d'application quand « Appliquer » est trop vague (remise en ligne, § 2.6 bis). */
  applyLabel?: string;
}) {
  const [typed, setTyped] = useState("");
  const confirmed = !withdrawal || isWithdrawalConfirmed(typed, withdrawal.targetName);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleApply() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyRevisionAction(revisionId, withdrawal ? typed : undefined);
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

  /**
   * Copie le nom à saisir : 326 noms de produits publiés en production portent un tiret
   * demi-cadratin (263) ou cadratin (73), intapables sur un clavier AZERTY sans
   * effort, et certains font 136 caractères. La saisie reste exigée (le champ ne se remplit
   * pas seul) : on aide à l'écrire, on ne la supprime pas. `clipboard` manque hors
   * contexte sécurisé : le nom reste alors sélectionnable d'un clic (`select-all`).
   */
  async function handleCopyName() {
    if (!withdrawal) return;
    try {
      await navigator.clipboard.writeText(withdrawal.targetName);
      toast.success("Nom copié : collez-le dans le champ.");
    } catch {
      toast.error("Copie impossible : sélectionnez le nom affiché et copiez-le à la main.");
    }
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
      {withdrawal && (
        <div className="space-y-2">
          <label htmlFor="withdrawal-confirmation" className="text-sm font-medium">
            Pour confirmer le retrait, saisissez exactement : <span className="select-all break-words font-mono">{withdrawal.targetName}</span>
          </label>
          <div className="flex gap-2">
            <Input
              id="withdrawal-confirmation"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="min-h-11"
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0"
              disabled={isPending || !withdrawal.targetName}
              onClick={handleCopyName}
            >
              Copier le nom
            </Button>
          </div>
        </div>
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
            variant={withdrawal ? "destructive" : "default"}
            disabled={isPending || !confirmed}
            onClick={handleApply}
          >
            {withdrawal ? "Retirer du public" : (applyLabel ?? "Appliquer")}
          </Button>
        </div>
      </div>
    </div>
  );
}
