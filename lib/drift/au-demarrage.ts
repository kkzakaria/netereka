/**
 * Vérification de dérive au démarrage du Worker — LIAISONS SEULEMENT.
 *
 * Pourquoi seulement les liaisons : la forme de la base demande une trentaine
 * de requêtes `PRAGMA`. Payer ça une fois par isolat, c'est le payer des
 * dizaines de fois par jour sur un Worker qui démarre froid en permanence, et
 * sur le chemin d'une vraie requête d'utilisateur. Les liaisons, elles, sont
 * déjà en mémoire : `Object.keys(env)` et rien d'autre.
 *
 * Pourquoi UNE SEULE FOIS par isolat : même motif que
 * `lib/mcp/local-jwks.ts` — un symbole global, idempotent. Posé AVANT le
 * travail, pas après : si quelque chose levait malgré tout, on ne veut pas que
 * chaque requête suivante retente et re-journalise.
 *
 * Pourquoi ça ne peut PAS mettre le site à terre : tout le corps est sous
 * `try`, rien n'est levé, rien n'est renvoyé. Un garde-fou qui met la vitrine à
 * terre est pire que la dérive qu'il signale. Il journalise bruyamment — un
 * seul appel à `console.error`, multiligne, que Workers Logs indexe (activé
 * dans `wrangler.jsonc`) — et c'est tout.
 */

import { comparerLiaisons } from "./comparer-liaisons";
import { LIAISONS_DECLAREES } from "./liaisons-declarees";
import { bilan, formaterBilan, formaterSection } from "./rapport";
import type { LiaisonReelle } from "./types";

const DEJA_FAIT = Symbol.for("netereka.derive.liaisonsVerifiees");

type GlobalMarque = typeof globalThis & { [DEJA_FAIT]?: boolean };

/** Exporté pour le test : remet l'isolat dans l'état « pas encore vérifié ». */
export function reinitialiserVerificationLiaisons(): void {
  delete (globalThis as GlobalMarque)[DEJA_FAIT];
}

/**
 * Lit les noms de liaisons portés par l'objet `env` de cet isolat.
 *
 * On ne garde que les clés propres et énumérables, et on ignore les valeurs :
 * un rapport de dérive ne doit jamais contenir la valeur d'un secret.
 */
export function liaisonsDeLIsolat(env: unknown): LiaisonReelle[] {
  if (env === null || typeof env !== "object") return [];
  return Object.keys(env as Record<string, unknown>)
    .sort()
    .map((nom) => ({ nom, type: typeDeLiaison((env as Record<string, unknown>)[nom]), source: "isolat du Worker" }));
}

function typeDeLiaison(valeur: unknown): string {
  if (typeof valeur === "string") return "chaîne (secret ou var)";
  if (valeur === null || valeur === undefined) return "absente (clé présente, valeur vide)";
  if (typeof valeur === "object") {
    const nom = (valeur as { constructor?: { name?: string } }).constructor?.name;
    return nom && nom !== "Object" ? nom : "objet";
  }
  return typeof valeur;
}

/**
 * À appeler là où l'environnement est en main. Ne lève jamais.
 *
 * @param env l'objet `env` de `getCloudflareContext()`
 */
export function verifierLiaisonsUneFois(env: unknown): void {
  // Le drapeau est posé DANS le try, et c'est ce qui rend vraie la promesse
  // « ne lève jamais ». Au-dehors, une levée de `globalThis` — un objet gelé,
  // un proxy hostile — sortait de cette fonction : `getDB()`, `getKV()` et
  // `getR2()` échouaient tous, et comme le drapeau n'était alors pas posé,
  // cela recommençait à CHAQUE requête. Un garde-fou qui met le site à terre
  // est pire que pas de garde-fou.
  try {
    const g = globalThis as GlobalMarque;
    if (g[DEJA_FAIT]) return;
    g[DEJA_FAIT] = true;

    const reelles = liaisonsDeLIsolat(env);
    // Un `env` vide ne veut pas dire « tout manque » : il veut dire qu'on ne
    // voit rien. Comparer dans ce cas produirait un mur d'écarts faux, qui est
    // la façon la plus sûre de faire désactiver un garde-fou.
    if (reelles.length === 0) {
      console.error("[dérive] liaisons non vérifiées : l'objet env de cet isolat ne porte aucune clé lisible.");
      return;
    }

    const ecarts = comparerLiaisons(LIAISONS_DECLAREES, reelles, {
      sourceDeclaration: "env.d.ts (via lib/drift/liaisons-declarees.ts)",
    });
    const b = bilan(ecarts);
    if (!b.derive) return;

    const texte = formaterSection(
      ecarts.filter((e) => e.gravite !== "information"),
      {
        titre: "DÉRIVE DES LIAISONS — env.d.ts ↔ cet isolat",
        sources: [
          "Déclaré : interface CloudflareEnv (env.d.ts)",
          "Réel    : clés de l'objet env de cet isolat du Worker",
        ],
      },
    );
    console.error(`[dérive]\n${texte}${formaterBilan(b)}`);
  } catch (err) {
    // Jamais de levée : le site répond, quoi qu'il arrive au garde-fou.
    console.error("[dérive] vérification des liaisons impossible", err);
  }
}
