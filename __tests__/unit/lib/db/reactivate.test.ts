import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * La remise en ligne (§ 2.6 bis), contre un vrai SQLite au schéma des migrations :
 * le batch d'`applyRevision` est réellement rejoué, et les gardes sont éprouvées
 * sur l'état réel de la ligne, pas sur un mock qui répondrait ce qu'on attend.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

import { createRevision, applyRevision, RevisionError } from "@/lib/db/revisions";

const ACTOR = { id: "mcp-1", name: "Assistant" };
const ADMIN = { id: "admin-1", name: "Admin" };

let db: DatabaseSync;

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  db.exec(`
    INSERT INTO categories (id, name, slug) VALUES ('c1', 'Téléphones', 'telephones');
    INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft, is_featured, stock_quantity, description) VALUES
      ('off',   'c1', 'Fiche retirée', 'fiche-retiree', 1000, 0, 0, 1, 4, '<p>Texte</p>'),
      ('live',  'c1', 'En ligne',      'en-ligne',      1000, 1, 0, 0, 4, '<p>Texte</p>'),
      ('draft', 'c1', 'Brouillon',     'brouillon',     1000, 0, 1, 0, 0, NULL);
    INSERT INTO banners (id, title, link_url, is_active) VALUES (1, 'Éteinte', '/x', 0);
  `);
});

const deposit = (id: string, payload: Record<string, unknown> = {}, target: "product" | "banner" = "product") =>
  createRevision({ target, targetId: id, kind: "reactivate", payload, origin: "mcp", actor: ACTOR, summary: "Réassort reçu" });

async function code(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof RevisionError ? e.code : "autre";
  }
}

describe("déposer une remise en ligne", () => {
  it("dépose pending sur une fiche publiée et retirée, sans toucher la fiche", async () => {
    const { revisionId, status } = await deposit("off");
    expect(status).toBe("pending");
    expect(db.prepare("SELECT kind, payload, summary FROM content_revisions WHERE id = ?").get(revisionId))
      .toEqual({ kind: "reactivate", payload: "{}", summary: "Réassort reçu" });
    expect(db.prepare("SELECT is_active FROM products WHERE id = 'off'").get()).toEqual({ is_active: 0 });
    expect(db.prepare("SELECT action FROM audit_log WHERE target_id = 'off'").get()).toEqual({ action: "revision.created.reactivate" });
  });

  it("refuse une fiche déjà en ligne (conflict), un brouillon (validation_error), une cible inconnue (not_found)", async () => {
    expect(await code(deposit("live"))).toBe("conflict");
    expect(await code(deposit("draft"))).toBe("validation_error");
    expect(await code(deposit("nope"))).toBe("not_found");
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });

  it("refuse une bannière : elle se remet en ligne depuis sa liste", async () => {
    expect(await code(deposit("1", {}, "banner"))).toBe("validation_error");
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });

  it("refuse un payload non vide : la remise en ligne n'est pas dans le payload", async () => {
    expect(await code(deposit("off", { is_active: 1 }))).toBe("validation_error");
    expect(await code(deposit("off", { name: "Autre nom" }))).toBe("validation_error");
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });
});

describe("appliquer une remise en ligne", () => {
  it("écrit is_active = 1 SANS saisie de confirmation, et ne touche rien d'autre", async () => {
    const before = db.prepare("SELECT * FROM products WHERE id = 'off'").get() as Record<string, unknown>;
    const { revisionId } = await deposit("off");
    await applyRevision(revisionId, ADMIN); // aucune confirmation : ce n'est pas un retrait
    const after = db.prepare("SELECT * FROM products WHERE id = 'off'").get() as Record<string, unknown>;
    expect(after.is_active).toBe(1);
    const untouched = (row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).filter(([k]) => k !== "is_active" && k !== "updated_at"));
    expect(untouched(after)).toEqual(untouched(before)); // is_draft, vedette, stock, contenu : intacts
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(revisionId)).toEqual({ status: "applied" });
  });

  it("is_active vient de la branche du type : un payload trafiqué en base ne dicte rien", async () => {
    const { revisionId } = await deposit("off");
    db.prepare("UPDATE content_revisions SET payload = ? WHERE id = ?").run(JSON.stringify({ is_active: 0, name: "Piraté" }), revisionId);
    expect(await code(applyRevision(revisionId, ADMIN))).toBe("validation_error");
    expect(db.prepare("SELECT is_active, name FROM products WHERE id = 'off'").get()).toEqual({ is_active: 0, name: "Fiche retirée" });
  });

  it("re-vérifie à l'application : une fiche redevenue brouillon n'est pas levée sur is_active seul", async () => {
    const { revisionId } = await deposit("off");
    // Sans toucher updated_at : la garde de version ne peut pas l'attraper, seul le contrôle d'état le peut.
    db.exec("UPDATE products SET is_draft = 1 WHERE id = 'off'");
    expect(await code(applyRevision(revisionId, ADMIN))).toBe("validation_error");
    expect(db.prepare("SELECT is_active, is_draft FROM products WHERE id = 'off'").get()).toEqual({ is_active: 0, is_draft: 1 });
  });

  it("re-vérifie à l'application : une fiche déjà remise en ligne ailleurs donne un conflit, pas un succès muet", async () => {
    const { revisionId } = await deposit("off");
    db.exec("UPDATE products SET is_active = 1 WHERE id = 'off'");
    expect(await code(applyRevision(revisionId, ADMIN))).toBe("conflict");
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(revisionId)).toEqual({ status: "pending" });
  });

  it("la bascule directe de la liste entre-temps périme la révision (version de la ligne)", async () => {
    const { revisionId } = await deposit("off");
    db.exec("UPDATE products SET is_active = 1, updated_at = datetime('now', '+1 minute') WHERE id = 'off'");
    expect(await code(applyRevision(revisionId, ADMIN))).toBe("conflict");
  });

  it("périme les autres révisions en attente sur la même fiche", async () => {
    const a = await deposit("off");
    const b = await createRevision({ target: "product", targetId: "off", kind: "update", payload: { name: "Renommée" }, origin: "mcp", actor: ACTOR });
    const r = await applyRevision(a.revisionId, ADMIN);
    expect(r.superseded).toBe(1);
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(b.revisionId)).toEqual({ status: "superseded" });
  });
});

describe("la symétrie avec le retrait", () => {
  it("un retrait appliqué puis une remise en ligne appliquée rendent la fiche telle qu'elle était", async () => {
    const before = db.prepare("SELECT is_active, is_draft, name, stock_quantity FROM products WHERE id = 'live'").get();
    const w = await createRevision({ target: "product", targetId: "live", kind: "withdraw", payload: {}, origin: "mcp", actor: ACTOR });
    await applyRevision(w.revisionId, ADMIN, { confirmation: "En ligne" });
    expect(db.prepare("SELECT is_active FROM products WHERE id = 'live'").get()).toEqual({ is_active: 0 });
    // updated_at a avancé dans la même seconde : on le décale pour que la garde de version lise la valeur courante.
    const r = await deposit("live");
    await applyRevision(r.revisionId, ADMIN);
    expect(db.prepare("SELECT is_active, is_draft, name, stock_quantity FROM products WHERE id = 'live'").get()).toEqual(before);
  });

  it("publish refuse toujours une fiche retirée : seule reactivate la remet en ligne", async () => {
    expect(await code(createRevision({ target: "product", targetId: "off", kind: "publish", payload: {}, origin: "mcp", actor: ACTOR }))).toBe("conflict");
  });
});
