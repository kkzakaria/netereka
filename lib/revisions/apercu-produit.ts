import { PRODUCT_WRITABLE_COLUMN_LIST, type RevisionRecord } from "@/lib/db/revisions";
import type { ProductDetail } from "@/lib/db/types";

/**
 * La fiche produit TELLE QU'ELLE SERAIT si cette révision était appliquée.
 *
 * Même raison d'être que `banniereApresRevision` : une révision n'est nulle
 * part tant qu'elle n'est pas appliquée, et la description d'un produit est
 * du HTML LIBRE — celui que l'assistant compose. Son auteur ne pouvait voir
 * que la fiche en ligne, c'est-à-dire l'ancienne.
 *
 * Mêmes règles que `applyRevision`, reprises et non réinventées :
 *  - seules les colonnes de `PRODUCT_WRITABLE_COLUMN_LIST` sont appliquées.
 *    `attributes` et `slug` n'en font pas partie — ce ne sont pas des
 *    colonnes de `products` —, et les outils les refusent avant le dépôt ;
 *  - `publish` lève `is_draft` ET `is_active` (§ 2.8 : publier rend visible,
 *    et ne lever que `is_draft` publiait une fiche que personne ne voyait) ;
 *  - `withdraw` et `reactivate` ne touchent qu'`is_active`, et le payload de
 *    ces natures est vide — c'est la NATURE qui décide, jamais le contenu ;
 *  - les natures enfant (`add_images`, `remove_image`, `set_variants`)
 *    n'écrivent aucune colonne de `products` : la fiche est rendue telle
 *    quelle. L'aperçu ne prétend donc pas montrer des images qu'il ne sait
 *    pas composer.
 */
export function produitApresRevision(courant: ProductDetail, revision: RevisionRecord): ProductDetail {
  const apres: ProductDetail = { ...courant };

  if (revision.kind === "update" || revision.kind === "create") {
    for (const colonne of PRODUCT_WRITABLE_COLUMN_LIST) {
      if (colonne in revision.payload) {
        (apres as unknown as Record<string, unknown>)[colonne] = revision.payload[colonne];
      }
    }
  }

  if (revision.kind === "publish") {
    apres.is_draft = 0;
    apres.is_active = 1;
  }
  if (revision.kind === "withdraw") apres.is_active = 0;
  if (revision.kind === "reactivate") apres.is_active = 1;

  return apres;
}
