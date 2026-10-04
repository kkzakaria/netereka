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
 * Mêmes règles que `applyRevision` — mais REPRODUITES, pas appelées, et
 * c'est la faiblesse connue de ce module : rien ne lie cette copie à
 * l'original. Une nature de révision ajoutée demain ne fera pas échouer la
 * compilation ici, et l'aperçu rendrait la fiche inchangée sans un mot. Le
 * remède serait d'extraire de `applyRevision` une fonction pure « colonnes
 * écrites par (nature, cible, payload) » et de l'appeler des deux côtés ;
 * c'est un chantier sur le chemin d'écriture, pas sur l'aperçu, et il n'est
 * pas fait ici. Les règles, en l'état :
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

/**
 * Ce que cette révision change ET que la page d'aperçu ne montre pas.
 *
 * La page rend le contenu éditorial — nom, description, FAQ, attributs. Mais
 * la fusion applique TOUTE la liste blanche : une révision peut changer le
 * prix, le stock, la marque ou les métadonnées sans que l'écran en dise un
 * mot. Taire le prix serait le mensonge le plus coûteux de cet aperçu : une
 * révision qui passe 15 000 à 1 500 XOF s'afficherait comme une simple
 * retouche de texte.
 *
 * On ne les RENDE pas — ce n'est pas ce qu'on vient juger ici, et l'écran de
 * validation les montre déjà en diff — mais on les NOMME.
 */
const LIBELLES_CHAMPS: Record<string, string> = {
  base_price: "le prix",
  compare_price: "le prix barré",
  stock_quantity: "le stock",
  low_stock_threshold: "le seuil de stock bas",
  sku: "la référence",
  brand: "la marque",
  category_id: "la catégorie",
  short_description: "l'accroche",
  is_featured: "la mise en avant",
  weight_grams: "le poids",
  meta_title: "le titre SEO",
  meta_description: "la description SEO",
};

export function champsNonRendus(revision: RevisionRecord): string[] {
  if (revision.kind !== "update" && revision.kind !== "create") return [];
  const touches = Object.keys(revision.payload)
    .filter((c) => c in LIBELLES_CHAMPS)
    .map((c) => LIBELLES_CHAMPS[c]);
  if (touches.length === 0) return [];
  return [`Cette révision modifie aussi ${touches.join(", ")} — non montré ici, voir le diff.`];
}
