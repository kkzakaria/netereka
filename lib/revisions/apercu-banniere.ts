import { BANNER_WRITABLE_COLUMN_LIST, type RevisionRecord } from "@/lib/db/revisions";
import { raisonsDeNonAffichage } from "@/lib/db/storefront/banners";
import type { Banner } from "@/lib/db/types";

/**
 * La bannière TELLE QU'ELLE SERAIT si cette révision était appliquée.
 *
 * Elle existe parce qu'un auteur — l'assistant comme l'administrateur — ne
 * pouvait voir que deux choses : ce qui est EN LIGNE, et un aperçu
 * d'administration en 624 × 240 avec sa propre copie du CSS. Ni l'un ni
 * l'autre ne répond à « à quoi ressemblera ce que je propose ».
 *
 * TROIS RÈGLES, REPRODUITES de `applyRevision` — pas appelées, et c'est la
 * faiblesse connue de ce module : rien ne lie cette copie à l'original. Une
 * nature ajoutée demain ne fera pas échouer la compilation ici. Le remède
 * serait d'extraire de `applyRevision` une fonction pure « colonnes écrites
 * par (nature, cible, payload) » et de l'appeler des deux côtés ; c'est un
 * chantier sur le chemin d'écriture, et il n'est pas fait ici. Les règles :
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

/**
 * Le CARROUSEL tel qu'il serait, pas la diapositive seule.
 *
 * Une bannière ne se juge pas hors de son voisinage : on veut voir où elle
 * tombe dans l'ordre, ce qui la précède et ce qui la suit, et les puces de
 * navigation. L'aperçu rendait une diapositive isolée — il répondait « ma
 * composition est-elle bien formée », pas « comment se tient-elle parmi les
 * autres ».
 *
 * Deux cas, et un seul verdict pour les deux : `raisonsDeNonAffichage`, la
 * même lecture de « affichée » que la vitrine et que `list_banners`.
 *  - la bannière révisée s'afficherait : elle REMPLACE sa version actuelle
 *    dans la liste, ou s'y INSÈRE à son rang si elle n'y était pas (une
 *    création, ou une réactivation par les dates) ;
 *  - elle ne s'afficherait pas (un retrait, une fenêtre passée) : elle sort
 *    de la liste, et l'aperçu montre le carrousel amputé — c'est précisément
 *    ce qu'un administrateur doit voir avant d'appliquer un retrait.
 *
 * L'ordre est celui de `displayedBannerOrder` : `display_order`, puis `id`
 * pour départager. Sans ce départage, deux bannières de même rang
 * n'auraient que l'ordre que SQLite veut bien leur donner.
 */
export function carrouselApresRevision(affichees: Banner[], apres: Banner, now: string): Banner[] {
  const sansElle = affichees.filter((b) => b.id !== apres.id);
  if (raisonsDeNonAffichage(apres, now).length > 0) return sansElle;
  return [...sansElle, apres].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
}
