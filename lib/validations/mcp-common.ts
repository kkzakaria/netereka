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
