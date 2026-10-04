/**
 * Ce que la BASE contient réellement : `sqlite_master` et les `PRAGMA`, lus à
 * travers `wrangler d1 execute`.
 *
 * D1 expose les pragmas sous forme de fonctions-tables
 * (`pragma_table_info(...)`), ce qui permet de tout collecter en cinq requêtes
 * au lieu d'une centaine. Vérifié contre la base distante.
 *
 * LECTURE SEULE. Les requêtes sont des CONSTANTES de ce fichier, et c'est ce
 * qui le garantit. Le contrôle `^SELECT\b` de `lancerRequete` est un filet,
 * pas une preuve : il laisserait passer un « SELECT 1; DROP TABLE x ». Ne lui
 * confiez pas une requête construite à partir d'une entrée.
 */

import { execFileSync } from "node:child_process";
import {
  TABLES_HORS_PERIMETRE,
  type FormeBase,
  type FormeCleEtrangere,
  type FormeColonne,
  type FormeIndex,
  type FormeTable,
} from "@/lib/drift/types";

export type Cible = "remote" | "local";

const BASE = "netereka-db";

function lancerRequete<T>(cible: Cible, sql: string): T[] {
  const nettoye = sql.trim();
  if (!/^SELECT\b/i.test(nettoye)) {
    throw new Error(`Refus : seules les requêtes SELECT sont autorisées ici. Reçu : ${nettoye.slice(0, 40)}…`);
  }
  const brut = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", BASE, `--${cible}`, "--json", "--command", nettoye],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const debut = brut.indexOf("[");
  if (debut === -1) throw new Error(`Réponse de wrangler illisible :\n${brut.slice(0, 500)}`);
  const parse = JSON.parse(brut.slice(debut)) as { results: T[]; success: boolean }[];
  return parse.flatMap((p) => p.results ?? []);
}

/**
 * Compte les `CHECK` d'un `CREATE TABLE`, en séparant les nommés des anonymes.
 *
 * SQLite ne conserve pas le nom d'une contrainte écrite en ligne
 * (`rating INTEGER CHECK (rating BETWEEN 1 AND 5)`), alors que Drizzle nomme
 * toujours les siennes. Sans ce comptage, le moteur annoncerait « contrainte
 * absente » sur une contrainte qui est là — exactement le faux écart qui
 * décrédibilise un garde-fou.
 *
 * Les littéraux de chaîne sont retirés avant comptage pour qu'une valeur par
 * défaut contenant le mot CHECK ne fausse rien.
 */
export function analyserChecks(sqlCreate: string): { nommes: string[]; anonymes: number } {
  const sansChaines = sqlCreate.replace(/'(?:[^']|'')*'/g, "''");
  const nommes: string[] = [];
  const motifNomme = /CONSTRAINT\s+(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_]\w*))\s+CHECK\s*\(/gi;
  for (const m of sansChaines.matchAll(motifNomme)) {
    nommes.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  }
  const total = [...sansChaines.matchAll(/\bCHECK\s*\(/gi)].length;
  return { nommes: nommes.sort(), anonymes: Math.max(0, total - nommes.length) };
}

interface LigneColonne { t: string; c: string; nn: number; pk: number }
interface LigneIndex { t: string; idx: string; uniq: number; origin: string }
interface LigneIndexCol { t: string; idx: string; seqno: number; col: string | null }
interface LigneFK { t: string; id: number; seq: number; ftable: string; fcol: string; tcol: string | null }

export function lireBaseReelle(cible: Cible): FormeBase {
  const horsPerimetre = new Set(TABLES_HORS_PERIMETRE);
  const filtre = `m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '\\_%' ESCAPE '\\'`;

  const tablesSql = lancerRequete<{ name: string; sql: string | null }>(
    cible,
    `SELECT m.name AS name, m.sql AS sql FROM sqlite_master m WHERE ${filtre}`,
  ).filter((t) => !horsPerimetre.has(t.name));

  if (tablesSql.length === 0) {
    throw new Error(
      "Aucune table lue en base — lecture suspecte, on refuse de comparer. (Deux descriptions vides concordent toujours ; c'est le faux vert qu'on veut éviter.)",
    );
  }

  const colonnes = lancerRequete<LigneColonne>(
    cible,
    `SELECT m.name AS t, p.name AS c, p."notnull" AS nn, p.pk AS pk
     FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE ${filtre}`,
  );

  const indexes = lancerRequete<LigneIndex>(
    cible,
    `SELECT m.name AS t, il.name AS idx, il."unique" AS uniq, il.origin AS origin
     FROM sqlite_master m JOIN pragma_index_list(m.name) il WHERE ${filtre}`,
  );

  const indexCols = lancerRequete<LigneIndexCol>(
    cible,
    `SELECT m.name AS t, il.name AS idx, ii.seqno AS seqno, ii.name AS col
     FROM sqlite_master m JOIN pragma_index_list(m.name) il JOIN pragma_index_xinfo(il.name) ii
     WHERE ${filtre} AND ii.key = 1 ORDER BY il.name, ii.seqno`,
  );

  const fks = lancerRequete<LigneFK>(
    cible,
    `SELECT m.name AS t, fk.id AS id, fk.seq AS seq, fk."table" AS ftable, fk."from" AS fcol, fk."to" AS tcol
     FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) fk WHERE ${filtre} ORDER BY m.name, fk.id, fk.seq`,
  );

  // Clé primaire de chaque table, pour résoudre les clés étrangères écrites
  // sans colonne cible (`REFERENCES produits` au lieu de `REFERENCES produits(id)`),
  // que SQLite rend avec `to = NULL`.
  const pkParTable = new Map<string, string[]>();
  for (const l of colonnes) {
    if (l.pk <= 0) continue;
    const liste = pkParTable.get(l.t) ?? [];
    liste.push(l.c);
    pkParTable.set(l.t, liste);
  }
  for (const [t, liste] of pkParTable) {
    const ordre = new Map(colonnes.filter((l) => l.t === t && l.pk > 0).map((l) => [l.c, l.pk]));
    liste.sort((a, b) => (ordre.get(a) ?? 0) - (ordre.get(b) ?? 0));
  }

  const colonnesIndex = new Map<string, (string | null)[]>();
  for (const l of indexCols) {
    const cle = `${l.t}\u0000${l.idx}`;
    const liste = colonnesIndex.get(cle) ?? [];
    liste.push(l.col);
    colonnesIndex.set(cle, liste);
  }

  const tables: FormeTable[] = tablesSql.map((t) => {
    const cols: FormeColonne[] = colonnes
      .filter((l) => l.t === t.name)
      .map((l) => ({ nom: l.c, nonNul: l.nn === 1 }));

    const idxTable = indexes.filter((l) => l.t === t.name);
    const colsDe = (idx: string) => colonnesIndex.get(`${t.name}\u0000${idx}`) ?? [];

    // origin 'c'  = créé par CREATE INDEX. Nommé, mais le nom n'est comparable
    //               que s'il ne s'agit PAS d'un index unique : drizzle-kit en
    //               génère un (`<table>_<col>_unique`) pour chaque `.unique()`
    //               de colonne, là où une migration manuelle écrit un UNIQUE en
    //               ligne que SQLite range en origin 'u'. Même contrainte, noms
    //               incomparables.
    // origin 'u'  = index implicite d'un UNIQUE en ligne (`sqlite_autoindex_…`).
    // origin 'pk' = index implicite de la clé primaire, déjà couvert par
    //               `clePrimaire`.
    const index: FormeIndex[] = idxTable
      .filter((l) => l.origin === "c" && l.uniq !== 1)
      .map((l) => {
        const brut = colsDe(l.idx);
        // Une entrée nulle signifie « colonne d'expression » : on renonce à
        // comparer les colonnes de cet index plutôt que d'en inventer.
        const colonnesLues = brut.includes(null) ? null : (brut as string[]);
        return { nom: l.idx, unique: false, colonnes: colonnesLues };
      });

    const unicites = idxTable
      .filter((l) => l.uniq === 1 && l.origin !== "pk")
      .map((l) => colsDe(l.idx).filter((c): c is string => c !== null));

    const fkParId = new Map<number, FormeCleEtrangere>();
    for (const l of fks.filter((f) => f.t === t.name)) {
      const existante = fkParId.get(l.id);
      const cible = l.tcol ?? (pkParTable.get(l.ftable) ?? [])[l.seq] ?? "?";
      if (existante) {
        existante.colonnes.push(l.fcol);
        existante.colonnesCibles.push(cible);
      } else {
        fkParId.set(l.id, { colonnes: [l.fcol], tableCible: l.ftable, colonnesCibles: [cible] });
      }
    }

    const checks = analyserChecks(t.sql ?? "");

    return {
      nom: t.name,
      colonnes: cols,
      clePrimaire: pkParTable.get(t.name) ?? [],
      index,
      unicites,
      clesEtrangeres: [...fkParId.values()],
      checksNommes: checks.nommes,
      checksAnonymes: checks.anonymes,
    };
  });

  return { tables: tables.sort((a, b) => a.nom.localeCompare(b.nom)) };
}
