/**
 * Ce que le CODE déclare de la base : introspection des exports de
 * `lib/db/schema.ts` via `getTableConfig()` de `drizzle-orm/sqlite-core`.
 *
 * Le schéma Drizzle est la source de vérité du dépôt ; cette fonction la met
 * dans la forme neutre que le moteur sait comparer (`FormeBase`), sans rien
 * interpréter de plus.
 */

import { is, Column, SQL } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "@/lib/db/schema";
import type { FormeBase, FormeIndex, FormeTable } from "@/lib/drift/types";

/**
 * Colonnes d'un index déclaré.
 *
 * Drizzle rend soit une `Column` (cas courant), soit un `SQL` quand l'index
 * porte une expression — `index("x").on(desc(table.y))` par exemple, qui
 * existe bel et bien dans ce schéma (`idx_audit_log_created`). Dans ce cas on
 * va chercher la Colonne à l'intérieur des morceaux de la requête. Si on n'en
 * trouve pas exactement une, on rend `null` : le moteur se limitera alors à
 * comparer la présence de l'index, et le dira, au lieu d'inventer un écart.
 */
function colonnesDIndex(colonnes: readonly unknown[]): string[] | null {
  const noms: string[] = [];
  for (const c of colonnes) {
    if (is(c, Column)) {
      noms.push(c.name);
      continue;
    }
    if (is(c, SQL)) {
      const trouvees = (c as unknown as { queryChunks: unknown[] }).queryChunks.filter((q) => is(q, Column));
      if (trouvees.length !== 1) return null;
      noms.push((trouvees[0] as Column).name);
      continue;
    }
    return null;
  }
  return noms;
}

export function lireSchemaDeclare(): FormeBase {
  const tables: FormeTable[] = [];

  for (const exporte of Object.values(schema)) {
    if (!is(exporte, SQLiteTable)) continue;
    const config = getTableConfig(exporte);

    // Clé primaire : Drizzle la porte sur la colonne quand elle est simple, et
    // dans `primaryKeys` quand elle est composite. On fusionne les deux.
    const pkComposite = config.primaryKeys.flatMap((pk) => pk.columns.map((c) => c.name));
    const pkSimple = config.columns.filter((c) => c.primary).map((c) => c.name);
    const clePrimaire = pkComposite.length > 0 ? pkComposite : pkSimple;

    const tousIndex = config.indexes.map((i) => ({
      nom: i.config.name,
      unique: Boolean(i.config.unique),
      colonnes: colonnesDIndex(i.config.columns ?? []),
    }));

    // Seuls les index NON UNIQUES se comparent par leur nom.
    const index: FormeIndex[] = tousIndex.filter((i) => !i.unique);

    // Trois façons d'exprimer l'unicité, que Drizzle range à trois endroits :
    //  - `uniqueIndex("nom").on(...)` → dans `indexes`, avec unique=true ;
    //  - `unique().on(a, b)` au niveau table → dans `uniqueConstraints` ;
    //  - `.unique()` posé sur une colonne → sur la colonne (`isUnique`), PAS
    //    dans `uniqueConstraints`, qui reste vide. C'est la forme employée
    //    partout dans ce schéma ; l'oublier aurait rendu la comparaison de
    //    l'unicité perpétuellement muette.
    // Toutes se réduisent à une liste de colonnes, la seule chose que les deux
    // côtés savent dire de la même façon.
    const unicites: string[][] = [
      ...tousIndex.filter((i) => i.unique && i.colonnes !== null).map((i) => i.colonnes as string[]),
      ...config.uniqueConstraints.map((u) => u.columns.map((c) => c.name)),
      ...config.columns.filter((c) => c.isUnique).map((c) => [c.name]),
    ];

    tables.push({
      nom: config.name,
      colonnes: config.columns.map((c) => ({ nom: c.name, nonNul: c.notNull })),
      clePrimaire,
      index,
      unicites,
      clesEtrangeres: config.foreignKeys.map((fk) => {
        const ref = fk.reference();
        return {
          colonnes: ref.columns.map((c) => c.name),
          tableCible: getTableConfig(ref.foreignTable).name,
          colonnesCibles: ref.foreignColumns.map((c) => c.name),
        };
      }),
      checksNommes: config.checks.map((c) => c.name).sort(),
      // Drizzle exige un nom pour chaque `check(...)` : le code ne peut pas en
      // déclarer d'anonyme.
      checksAnonymes: 0,
    });
  }

  if (tables.length === 0) {
    throw new Error("Aucune table lue dans lib/db/schema.ts — lecture suspecte, on refuse de comparer.");
  }

  return { tables: tables.sort((a, b) => a.nom.localeCompare(b.nom)) };
}
