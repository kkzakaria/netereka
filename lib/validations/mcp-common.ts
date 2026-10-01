import { z } from "zod";

/** Motif d'un retrait : c'est le `summary` de la révision, la première chose
 *  que l'administrateur lit sous le titre de l'écran. Obligatoire : un retrait
 *  sans raison est celui qu'on ne peut pas juger. */
export const withdrawReasonSchema = z.string().trim().min(1).max(500);

/** Motif d'une modification : même exigence que le retrait, même emplacement
 *  (`summary`, sous le titre de l'écran). Sans lui, l'écran d'une modification
 *  de bannière n'a aucune ligne de raison alors que celui d'un retrait en a une. */
export const changeReasonSchema = withdrawReasonSchema;
