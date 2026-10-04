import { BANNER_WRITABLE_COLUMN_LIST, type RevisionRecord } from "@/lib/db/revisions";
import type { Banner } from "@/lib/db/types";

/**
 * La bannière TELLE QU'ELLE SERAIT si cette révision était appliquée.
 *
 * Elle existe parce qu'un auteur — l'assistant comme l'administrateur — ne
 * pouvait voir que deux choses : ce qui est EN LIGNE, et un aperçu
 * d'administration en 624 × 240 avec sa propre copie du CSS. Ni l'un ni
 * l'autre ne répond à « à quoi ressemblera ce que je propose ».
 *
 * TROIS RÈGLES, reprises de `applyRevision` et non réinventées — c'est la
 * seule façon qu'un aperçu ne mente pas :
 *
 * 1. Seules les colonnes de `BANNER_WRITABLE_COLUMN_LIST` sont reprises du
 *    payload. Une clé hors liste est refusée au DÉPÔT (`assertValidPayload`)
 *    et ne pourrait donc jamais atteindre la ligne : la montrer ici
 *    promettrait un rendu que l'application ne produirait pas.
 * 2. `create` active la bannière, `withdraw` la désactive, et ni l'une ni
 *    l'autre ne lit `is_active` du payload — cette colonne n'est pas
 *    inscriptible (§ 2.6), c'est la NATURE de la révision qui décide.
 * 3. Les natures enfant (`add_images`, `remove_image`, `set_variants`) sont
 *    refusées sur une cible bannière en amont ; elles ne changent donc rien
 *    ici, et la bannière courante est rendue telle quelle.
 *
 * Pure, sans I/O : l'appelant lit la révision et la bannière, cette fonction
 * ne fait que les combiner — ce qui la rend éprouvable sans base.
 */
export function banniereApresRevision(courante: Banner, revision: RevisionRecord): Banner {
  const apres: Banner = { ...courante };

  if (revision.kind === "update" || revision.kind === "create") {
    for (const colonne of BANNER_WRITABLE_COLUMN_LIST) {
      if (colonne in revision.payload) {
        (apres as unknown as Record<string, unknown>)[colonne] = revision.payload[colonne];
      }
    }
  }

  if (revision.kind === "create") apres.is_active = 1;
  if (revision.kind === "withdraw") apres.is_active = 0;

  return apres;
}
