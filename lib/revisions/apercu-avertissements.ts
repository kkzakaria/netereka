import type { RevisionRecord } from "@/lib/db/revisions";

/**
 * Ce qu'un aperçu doit DIRE en plus de ce qu'il montre.
 *
 * Un aperçu qui se contente de rendre ment par omission. `applyRevision`
 * refuse une révision qui n'est plus `pending`, et refuse celle dont la cible
 * a changé depuis le dépôt (`base_version`) : sans ces deux lectures, l'écran
 * rendait une révision rejetée comme si elle était applicable, et superposait
 * une révision périmée à un état qui a bougé — c'est-à-dire un rendu que
 * l'application REFUSERAIT de produire.
 *
 * Pure, pour que ces deux cas s'éprouvent sans base.
 */
export interface AvertissementApercu {
  /** Ce que l'administrateur doit lire avant de juger le rendu. */
  message: string;
  /** `true` quand l'application échouerait en l'état. */
  bloquant: boolean;
}

const STATUTS = {
  applied: "déjà appliquée",
  rejected: "rejetée",
  superseded: "périmée par une autre révision",
} as const;

export function avertissementsApercu(input: {
  revision: RevisionRecord;
  /** `updated_at` de la cible, maintenant. */
  versionActuelle: string | null;
  /** Raisons pour lesquelles la cible ne s'afficherait pas, si l'appelant sait les calculer. */
  raisonsDeNonAffichage?: readonly string[];
}): AvertissementApercu[] {
  const out: AvertissementApercu[] = [];
  const { revision, versionActuelle } = input;

  if (revision.status !== "pending") {
    const libelle = STATUTS[revision.status as keyof typeof STATUTS] ?? revision.status;
    out.push({
      message: `Cette révision est ${libelle} : elle ne peut plus être appliquée. Ce rendu montre ce qu'elle PROPOSAIT.`,
      bloquant: true,
    });
  }

  // Même contrôle que `applyRevision` : la cible a-t-elle bougé depuis le
  // dépôt ? Si oui, l'aperçu superpose la proposition à un état qu'elle n'a
  // jamais vu, et l'application refuserait.
  if (revision.base_version !== null && versionActuelle !== null && revision.base_version !== versionActuelle) {
    out.push({
      message:
        "La cible a été modifiée depuis le dépôt de cette révision : l'application la refusera (conflit). " +
        "Ce rendu superpose la proposition à l'état ACTUEL, qui n'est pas celui qu'elle a vu.",
      bloquant: true,
    });
  }

  const raisons = input.raisonsDeNonAffichage ?? [];
  if (raisons.length > 0) {
    out.push({
      message:
        `Une fois appliquée, cette bannière NE S'AFFICHERAIT PAS (${raisons.join(", ")}). ` +
        "Le carrousel ci-dessous est celui que verrait un visiteur — sans elle.",
      bloquant: false,
    });
  }

  return out;
}
