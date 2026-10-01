import { z } from "zod";

/** Motif d'un retrait : c'est le `summary` de la révision, la première chose
 *  que l'administrateur lit sous le titre de l'écran. Obligatoire : un retrait
 *  sans raison est celui qu'on ne peut pas juger. */
export const withdrawReasonSchema = z.string().trim().min(1).max(500);

/** Motif d'une MODIFICATION : même forme que le retrait, même emplacement (`summary`,
 *  sous le titre de l'écran), mais OPTIONNEL partout (update_banner, update_product).
 *  Un retrait sans raison ne se juge pas, d'où l'obligation ; exiger une ligne d'écran
 *  de deux outils déjà en service casserait leur contrat pour peu. Cohérent : tout ce
 *  qui modifie l'accepte, seul ce qui retire l'exige. */
export const changeReasonSchema = withdrawReasonSchema;
