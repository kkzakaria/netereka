import { z } from "zod";

/** Motif d'un retrait : c'est le `summary` de la révision, la première chose
 *  que l'administrateur lit sous le titre de l'écran. Obligatoire : un retrait
 *  sans raison est celui qu'on ne peut pas juger. */
export const withdrawReasonSchema = z.string().trim().min(1).max(500);
