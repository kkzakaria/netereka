/**
 * Contrôle de dérive, à la demande ou en intégration continue.
 *
 *   npm run check:drift            # liaisons + base distante
 *   npm run check:drift -- --local # base locale au lieu de la distante
 *   npm run check:drift -- --liaisons-seules
 *   npm run check:drift -- --base-seule
 *
 * Codes de sortie, et ils ne disent pas la même chose :
 *   0 — le contrôle a tourné, aucune ERREUR.
 *   1 — le contrôle a tourné et a trouvé au moins une erreur.
 *   2 — le contrôle N'A PAS PU tourner. Le garde-fou est en panne, ce qui est
 *       plus grave qu'une dérive : personne ne surveille plus rien. Le
 *       workflow les annote différemment, sans quoi les deux donnent le même
 *       ✗ et une panne silencieuse passe pour une dérive connue.
 *
 * Les `avertissement` sont IMPRIMÉS mais ne font pas échouer : ils nomment
 * des écarts que personne ne peut résoudre aujourd'hui (dix-huit clés
 * primaires nullables héritées de SQLite), et les compter rendait le travail
 * nocturne rouge pour toujours. Voir `bilan()`, lib/drift/rapport.ts. Les
 * `information` (une liaison déclarée OPTIONNELLE et absente) non plus : le
 * code a explicitement prévu ce cas.
 *
 * LECTURE SEULE de bout en bout. Aucune écriture, ni en base, ni sur le Worker.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import { comparerBase } from "@/lib/drift/comparer-base";
import { comparerLiaisons } from "@/lib/drift/comparer-liaisons";
import { bilan, formaterBilan, formaterSection } from "@/lib/drift/rapport";
import type { Ecart } from "@/lib/drift/types";
import { lireEnvDtsDuDepot, racineDepot } from "./racine";
import { lireSchemaDeclare } from "./lire-schema-drizzle";
import { lireBaseReelle, type Cible } from "./lire-base-reelle";
import { lireLiaisonsReelles } from "./lire-liaisons-reelles";

function main(): number {
  const args = process.argv.slice(2);
  const cible: Cible = args.includes("--local") ? "local" : "remote";
  const liaisonsSeules = args.includes("--liaisons-seules");
  const baseSeule = args.includes("--base-seule");

  const racine = racineDepot();
  const tous: Ecart[] = [];
  const sorties: string[] = [];

  sorties.push("");
  sorties.push("══════════════════════════════════════════════════════════════════");
  sorties.push("  CONTRÔLE DE DÉRIVE — ce que le code suppose ↔ ce qui existe");
  sorties.push(`  ${new Date().toISOString()}`);
  sorties.push("══════════════════════════════════════════════════════════════════");
  sorties.push("");

  if (!baseSeule) {
    const declarees = lireEnvDtsDuDepot();
    const { liaisons, versionId, versionDate } = lireLiaisonsReelles(path.join(racine, "wrangler.jsonc"));
    const ecarts = comparerLiaisons(declarees, liaisons);
    tous.push(...ecarts);
    sorties.push(
      formaterSection(ecarts, {
        titre: "LIAISONS — env.d.ts ↔ Worker de production",
        sources: [
          `Déclaré : ${declarees.length} champs de l'interface CloudflareEnv (${declarees.filter((d) => d.requise).length} requis, ${declarees.filter((d) => !d.requise).length} optionnels)`,
          `Réel    : ${liaisons.length} liaisons — version ${versionId.slice(0, 8)} du ${versionDate}, secrets vivants, vars de wrangler.jsonc`,
        ],
      }),
    );
  }

  if (!liaisonsSeules) {
    const declare = lireSchemaDeclare();
    const reel = lireBaseReelle(cible);
    const ecarts = comparerBase(declare, reel);
    tous.push(...ecarts);
    sorties.push(
      formaterSection(ecarts, {
        titre: `BASE — lib/db/schema.ts ↔ D1 ${cible === "remote" ? "distante (production)" : "locale"}`,
        sources: [
          `Déclaré : ${declare.tables.length} tables introspectées par getTableConfig()`,
          `Réel    : ${reel.tables.length} tables lues dans sqlite_master et les PRAGMA`,
          "Non comparés, par choix : types de colonnes (affinité SQLite trop lâche),",
          "valeurs par défaut (plusieurs écritures pour le même sens), expressions CHECK,",
          "ordre de tri des index, actions ON DELETE / ON UPDATE. Voir lib/drift/comparer-base.ts.",
        ],
      }),
    );
  }

  const b = bilan(tous);
  sorties.push(formaterBilan(b));
  sorties.push("");
  console.log(sorties.join("\n"));

  return b.derive ? 1 : 0;
}

// Exécuté seulement quand ce fichier est le point d'entrée, pour qu'un test
// puisse l'importer sans déclencher des appels réseau.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main());
  } catch (err) {
    console.error("\n[dérive] le contrôle n'a pas pu s'exécuter :", err instanceof Error ? err.message : err);
    console.error(
      "  Un contrôle qui n'a pas tourné n'est pas un contrôle vert. Sortie en échec délibérée.\n",
    );
    process.exit(2);
  }
}

export { main };
