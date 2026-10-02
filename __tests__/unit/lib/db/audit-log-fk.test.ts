import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * La migration 0023 retire une FOREIGN KEY que la PRODUCTION portait et que le
 * schéma Drizzle n'a jamais déclarée.
 *
 * Pourquoi ce test ne ressemble à aucun autre du dépôt : `createMigratedDb()`
 * rejoue les migrations Drizzle, et celles-ci n'ont JAMAIS créé cette
 * contrainte — elle venait d'une migration écrite à la main, d'avant
 * better-auth. Une base locale ne reproduit donc pas le défaut, et c'est
 * exactement pourquoi il a survécu si longtemps : il n'existait que là où
 * personne ne regardait.
 *
 * Ce test reconstruit donc l'état de production à la main, puis applique le
 * fichier de migration RÉEL. Sans la première moitié, il passerait au vert sans
 * rien prouver.
 */

const MIGRATION = resolve(process.cwd(), "drizzle/0023_lame_layla_miller.sql");

/** L'état de production : `users` héritée et vide, `user` peuplée, la FK vers la mauvaise. */
function productionShape(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT)`);
  db.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT)`);
  db.exec(`INSERT INTO user (id, name) VALUES ('adm-1', 'Admin')`);
  db.exec(`CREATE TABLE audit_log (
    id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
    action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
    details TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (actor_id) REFERENCES users(id))`);
  return db;
}

function applyMigration(db: DatabaseSync): void {
  const sql = readFileSync(MIGRATION, "utf-8");
  for (const chunk of sql.split("--> statement-breakpoint")) {
    const stmt = chunk.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim();
    if (stmt) db.exec(stmt);
  }
}

/** Ce que `createRevision` écrit dans le même lot que la révision elle-même. */
function writeAudit(db: DatabaseSync, actorId = "adm-1"): void {
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, actor_name, action, target_type, target_id)
     VALUES (?, ?, 'Admin', 'revision.created.update', 'banner', '7')`,
  ).run(`a-${Math.random()}`, actorId);
}

describe("migration 0023 : audit_log sans clé étrangère", () => {
  let db: DatabaseSync;
  beforeEach(() => { db = productionShape(); });

  it("reproduit le défaut de production : l'écriture d'audit viole la contrainte", () => {
    // Le message exact relevé dans les logs du Worker le 2026-10-02 :
    // « D1_ERROR: FOREIGN KEY constraint failed ».
    expect(() => writeAudit(db)).toThrow(/FOREIGN KEY constraint failed/i);
  });

  it("après la migration, l'écriture d'audit passe", () => {
    applyMigration(db);
    expect(() => writeAudit(db)).not.toThrow();
    expect((db.prepare("SELECT count(*) n FROM audit_log").get() as { n: number }).n).toBe(1);
  });

  it("la contrainte a disparu, et aucune autre ne l'a remplacée", () => {
    applyMigration(db);
    const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE name='audit_log'").get() as { sql: string }).sql;
    expect(sql).not.toMatch(/REFERENCES/i);
  });

  // Supprimer une table emporte ses index. La production en portait QUATRE,
  // dont un (`target`) que schema.ts ne déclarait pas et un (`created`) dont
  // l'ordre DESC n'y figurait pas : les reconstruire depuis le seul schéma
  // Drizzle les aurait perdus en silence.
  it("les quatre index sont rétablis, dont celui que le schéma ne déclarait pas", () => {
    applyMigration(db);
    const idx = (db.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='audit_log' AND name LIKE 'idx%'",
    ).all() as { name: string; sql: string }[]);
    expect(idx.map((i) => i.name).sort()).toEqual([
      "idx_audit_log_action", "idx_audit_log_actor", "idx_audit_log_created", "idx_audit_log_target",
    ]);
    expect(idx.find((i) => i.name === "idx_audit_log_created")!.sql).toMatch(/DESC/i);
  });

  // Elle est vide en production, mais une migration ne doit pas dépendre de la
  // vacuité de ce qu'elle réécrit.
  it("une ligne déjà présente survit à la réécriture", () => {
    db.exec(`INSERT INTO users (id, email) VALUES ('ancien', 'a@b.c')`);
    writeAudit(db, "ancien");
    applyMigration(db);
    const row = db.prepare("SELECT actor_id, action FROM audit_log").get() as { actor_id: string };
    expect(row.actor_id).toBe("ancien");
  });
});
