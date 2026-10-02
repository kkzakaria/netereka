/**
 * Localisation du dépôt, pour que le script et les tests lisent les mêmes
 * fichiers quel que soit le répertoire courant.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { lireLiaisonsDeclarees } from "./lire-env-dts";
import type { LiaisonDeclaree } from "@/lib/drift/types";

export function racineDepot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function cheminEnvDts(): string {
  return path.join(racineDepot(), "env.d.ts");
}

/** Les liaisons déclarées par l'`env.d.ts` de CE dépôt. */
export function lireEnvDtsDuDepot(): LiaisonDeclaree[] {
  return lireLiaisonsDeclarees(cheminEnvDts());
}
