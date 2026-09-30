import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Une vraie base SQLite (`node:sqlite`) au schéma RÉEL — les migrations de
 * `drizzle/*.sql` rejouées dans l'ordre —, exposée derrière l'interface D1 que
 * Drizzle attend (`prepare().bind().{all,raw,run,first}` et `batch`).
 *
 * Pour les tests qui doivent vérifier l'EFFET d'une requête et non son texte :
 * `d1-mock.ts` s'arrête sous Drizzle et n'exécute jamais le SQL, donc une
 * requête qui compte sur la mauvaise table y passe. Ici elle renvoie zéro.
 */
type SqlValue = string | number | bigint | null;

export function createMigratedDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  const dir = path.resolve(process.cwd(), "drizzle");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    db.exec(fs.readFileSync(path.join(dir, file), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  // Clés étrangères levées APRÈS les migrations (certaines les réactivent) :
  // les tests sèment seulement les lignes dont ils parlent (pas un `user` ni
  // une `whatsapp_sessions` pour chaque commande).
  db.exec("PRAGMA foreign_keys = OFF");
  return db;
}

export function sqliteD1(db: DatabaseSync) {
  function exec(sql: string, params: unknown[]) {
    const stmt = db.prepare(sql);
    const p = params as SqlValue[];
    return {
      rows: () => stmt.all(...p) as Record<string, unknown>[],
      arrays: () => {
        if (typeof stmt.setReturnArrays === "function") {
          stmt.setReturnArrays(true);
          return stmt.all(...p) as unknown as unknown[][];
        }
        return (stmt.all(...p) as Record<string, unknown>[]).map((r) => Object.values(r));
      },
      run: () => {
        const r = stmt.run(...p);
        return { success: true, meta: { changes: Number(r.changes) }, results: [] };
      },
    };
  }

  const bindStmt = (sql: string, params: unknown[]) => ({
    sql,
    params,
    run: async () => exec(sql, params).run(),
    all: async () => ({ results: exec(sql, params).rows() }),
    raw: async () => exec(sql, params).arrays(),
    first: async () => exec(sql, params).rows()[0] ?? null,
  });

  return {
    prepare: (sql: string) => ({ bind: (...params: unknown[]) => bindStmt(sql, params) }),
    batch: async (stmts: { sql: string; params: unknown[] }[]) => stmts.map((s) => exec(s.sql, s.params).run()),
  };
}
