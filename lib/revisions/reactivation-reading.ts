import type { ReactivationReadiness } from "@/lib/db/reactivation-readiness";

/**
 * Ce que l'écran d'une remise en ligne DIT (§ 2.6 bis), décidé ici et non dans
 * le JSX : Vitest tourne sans jsdom, seule une fonction pure se teste.
 *
 * Une remise en ligne est une apparition : elle se voit au premier chargement,
 * donc l'écran montre l'objet entier. Ce qu'il doit ajouter, c'est ce qui rend
 * la fiche impropre à la vitrine — des AVERTISSEMENTS, jamais des refus : le
 * contrôle de charte du lot A avertit sans bloquer, et une fiche sans stock peut
 * légitimement revenir en ligne avant un réassort.
 *
 * Aucun module serveur importé (types seulement) : utilisable partout.
 */

export type ReactivationWarningCode =
  | "no_image"
  | "no_primary_image"
  | "no_stock"
  | "stock_mismatch"
  | "no_description";

export interface ReactivationWarning {
  code: ReactivationWarningCode;
  text: string;
}

export interface ReactivationReading {
  /** Renseigné quand la remise en ligne ne changerait rien (déjà en ligne) ou ne s'applique pas (brouillon). */
  notApplicable: string | null;
  warnings: ReactivationWarning[];
  /** Dit explicitement qu'aucun défaut n'a été trouvé : un écran sans avertissement ne doit pas se lire comme un écran qu'on n'a pas mesuré. */
  allClear: string | null;
}

/** Balises qui portent du contenu visible sans texte. */
const MEDIA_TAG = /<(img|picture|video|iframe|svg|canvas|object|embed)\b/i;

/**
 * Une description « vide » pour le client : absente, blanche, ou du HTML sans
 * texte ni média (`<p></p>`, `<p>&nbsp;</p>`, un `<style>` seul). Pure.
 *
 * Le retrait des éléments `style`/`script` — leur CONTENU, pas seulement leurs
 * balises, sinon la feuille de style compterait comme du texte — est répété
 * jusqu'à point fixe, parce qu'une passe unique peut RECOMPOSER ce qu'elle vient
 * d'enlever : sur `<sty<style>x</style>le>body{color:red}</style>` elle laisse
 * exactement `<style>body{color:red}</style>`, dont le dépouillement des balises
 * rend `body{color:red}`. La fonction déclarait alors « non vide » une
 * description qui ne montre rien, et l'écran ne prévenait pas. Chaque tour
 * raccourcit la chaîne ou la laisse identique, d'où l'arrêt.
 */
export function isDescriptionEmpty(description: string | null | undefined): boolean {
  if (!description) return true;
  if (MEDIA_TAG.test(description)) return false;
  let stripped = description;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped.replace(/<(style|script)\b[\s\S]*?<\/\1\s*>/gi, "");
  } while (stripped !== previous);
  const text = stripped
    .replace(/<[^>]*>/g, "")
    // Ce qui reste de chevron après ce dépouillement est le fragment d'une balise
    // jamais fermée (`<script` en fin de chaîne), que le navigateur abandonne sans
    // rien afficher : ça ne doit donc pas compter pour du contenu. Accessoirement,
    // c'est ce qui empêche la sortie de reporter un `<script` intact.
    .replace(/[<>]/g, "")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/[\s ​]+/g, "");
  return text.length === 0;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Un client peut-il acheter quelque chose ? Dès qu'il y a des variantes actives,
 * le paiement ne regarde que la leur : il faut qu'UNE ait du stock (existence,
 * pas somme : un stock négatif n'est pas interdit en base). Sinon, celui de la fiche.
 */
export function hasPurchasableStock(
  r: Pick<ReactivationReadiness, "product_stock" | "active_variant_count" | "active_variants_in_stock">,
): boolean {
  return r.active_variant_count > 0 ? r.active_variants_in_stock > 0 : r.product_stock > 0;
}

export function reactivationWarnings(r: ReactivationReadiness): ReactivationWarning[] {
  const warnings: ReactivationWarning[] = [];

  if (r.image_count === 0) {
    warnings.push({
      code: "no_image",
      text:
        "Aucune image : la fiche paraîtra sans visuel. En paiement à la livraison, l'image est ce que le client " +
        "croit acheter.",
    });
  } else if (!r.has_primary_image) {
    warnings.push({
      code: "no_primary_image",
      text:
        `${plural(r.image_count, "image", "images")}, mais aucune n'est l'image principale : ` +
        "les cartes (catégories, recherche, accueil) paraîtront sans visuel.",
    });
  }

  const sellable = hasPurchasableStock(r);
  if (!sellable) {
    warnings.push({
      code: "no_stock",
      text:
        r.active_variant_count > 0
          ? `Stock nul : ${
              r.active_variant_count === 1
                ? "sa seule variante active n'a pas de stock"
                : `aucune de ses ${r.active_variant_count} variantes actives n'a de stock`
            }, aucune commande ne peut aboutir. ` +
            "À ignorer si la remise en ligne précède un réassort."
          : "Stock nul : 0 unité, aucune commande ne peut aboutir. À ignorer si la remise en ligne précède un réassort.",
    });
  }

  // La page lit le stock de la fiche, le paiement celui des variantes : quand ils divergent,
  // la vitrine peut afficher le contraire de ce que le client pourra faire.
  if (r.active_variant_count > 0 && r.product_stock !== r.active_variant_stock) {
    const pageSaysInStock = r.product_stock > 0;
    warnings.push({
      code: "stock_mismatch",
      text:
        `Le stock de la fiche (${r.product_stock}) diffère de la somme de ses variantes actives (${r.active_variant_stock}) : ` +
        (pageSaysInStock && !sellable
          ? "la page s'affichera « en stock » alors qu'aucune variante ne l'est."
          : !pageSaysInStock && sellable
            ? "la page s'affichera en rupture alors que des variantes sont achetables."
            : "le paiement ne lit que celui des variantes."),
    });
  }

  if (isDescriptionEmpty(r.description)) {
    warnings.push({
      code: "no_description",
      text: "Aucune description : la page n'aura pas de texte de présentation.",
    });
  }

  return warnings;
}

export function reactivationReading(r: ReactivationReadiness): ReactivationReading {
  const notApplicable = r.is_draft
    ? "Cette fiche est un brouillon : elle ne se remet pas en ligne, elle se publie (révision publish)."
    : r.is_active
      ? "Cette fiche est déjà en ligne : cette remise en ligne ne changerait rien."
      : null;
  const warnings = reactivationWarnings(r);
  return {
    notApplicable,
    warnings,
    allClear:
      warnings.length === 0
        ? "Aucun défaut constaté : la fiche a une image, du stock et une description."
        : null,
  };
}
