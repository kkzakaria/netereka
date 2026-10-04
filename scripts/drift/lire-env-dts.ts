/**
 * Lecture de l'interface `CloudflareEnv` d'`env.d.ts`, avec l'API du
 * compilateur TypeScript.
 *
 * Pourquoi pas une expression régulière : un champ mal lu produirait un faux
 * écart, et un garde-fou qui crie à tort se fait désactiver. Un commentaire de
 * bloc contenant `BRAVE_API_KEY?: string;` — il y en a précisément un dans
 * `env.d.ts` — suffirait à tromper une regex. Le compilateur, lui, ne voit que
 * les membres réels de l'interface et leur `questionToken`.
 *
 * Ne tourne qu'en Node (script et tests). Jamais importé par le Worker.
 */

import { readFileSync } from "node:fs";
import ts from "typescript";
import type { LiaisonDeclaree } from "@/lib/drift/types";

export const NOM_INTERFACE = "CloudflareEnv";

export function lireLiaisonsDeclarees(cheminEnvDts: string): LiaisonDeclaree[] {
  const source = ts.createSourceFile(
    cheminEnvDts,
    readFileSync(cheminEnvDts, "utf8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );

  const liaisons: LiaisonDeclaree[] = [];
  let trouvee = false;

  const visiter = (noeud: ts.Node): void => {
    if (ts.isInterfaceDeclaration(noeud) && noeud.name.text === NOM_INTERFACE) {
      trouvee = true;
      for (const membre of noeud.members) {
        if (!ts.isPropertySignature(membre)) continue;
        const nom = nomDuMembre(membre.name);
        if (nom === null) continue;
        liaisons.push({ nom, requise: membre.questionToken === undefined });
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(source);

  if (!trouvee) {
    // Lever, et pas rendre une liste vide : deux listes vides se comparent sans
    // écart, et un contrôle de dérive qui passe au vert parce qu'il n'a rien lu
    // est exactement le genre de test incapable d'échouer qu'on cherche à
    // éviter.
    throw new Error(`Interface ${NOM_INTERFACE} introuvable dans ${cheminEnvDts}`);
  }
  if (liaisons.length === 0) {
    throw new Error(`Interface ${NOM_INTERFACE} lue dans ${cheminEnvDts} mais vide — lecture suspecte, on refuse de comparer.`);
  }

  return liaisons;
}

function nomDuMembre(nom: ts.PropertyName): string | null {
  if (ts.isIdentifier(nom) || ts.isStringLiteral(nom)) return nom.text;
  // Nom calculé ou littéral numérique : on ne sait pas le lire, on le dit en
  // le laissant de côté plutôt qu'en inventant une valeur.
  return null;
}
