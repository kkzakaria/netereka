import { z } from "zod";

/** Motif d'un retrait : c'est le `summary` de la révision, la première chose
 *  que l'administrateur lit sous le titre de l'écran. Obligatoire : un retrait
 *  sans raison est celui qu'on ne peut pas juger. */
export const withdrawReasonSchema = z.string().trim().min(1).max(500);

/** Motif d'une MODIFICATION : même forme que le retrait, même emplacement (`summary`,
 *  sous le titre de l'écran). La règle : ce qui MODIFIE l'accepte sans l'exiger
 *  (`update_banner`, `update_product`) — exiger une ligne d'écran de deux outils déjà
 *  en service casserait leur contrat pour peu ; ce qui BASCULE LA VISIBILITÉ l'exige,
 *  parce qu'une telle décision sans raison ne se juge pas. Donc obligatoire aussi sur
 *  `reactivate_product` (`lib/mcp/tools/products.ts`), symétrique du retrait, et non
 *  « optionnel partout ». */
export const changeReasonSchema = withdrawReasonSchema;

/**
 * Un objet IMBRIQUÉ qui refuse les champs qu'il ne déclare pas, en les nommant.
 *
 * `lib/mcp/server.ts` rend stricte la RACINE des vingt outils. Sans ceci, le
 * silence qu'il ferme survivait un cran plus bas : une relecture a mesuré, par
 * un vrai client, que `pricing: { basePrice: 35000 }` rendait un succès et
 * écrivait `pricing: {}` — exactement l'incident du 2026-10-02, déplacé.
 *
 * Pire, le correctif de la racine y POUSSAIT l'appelant : son message répond
 * « n'accepte que : …, pricing, … », donc l'assistant corrige `base_price` en
 * `pricing: { … }` et, s'il se trompe à l'intérieur, retombe sur un succès pour
 * une écriture vide — avec cette fois la conviction d'avoir le bon conteneur.
 *
 * Le message nomme les champs de CE niveau, parce qu'un refus qui ne dit pas
 * quoi employer ne fait que déplacer les essais à l'aveugle.
 */
export function objetStrict<T extends z.ZodRawShape>(shape: T, chemin: string) {
  return z.strictObject(shape, {
    error:
      `Champ inconnu dans « ${chemin} ». Cet objet n'accepte que : ` +
      `${Object.keys(shape).sort().join(", ")}.`,
  });
}
