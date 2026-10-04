import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * Le cycle de vie R2 de l'image d'une bannière, bout en bout, contre un vrai
 * SQLite.
 *
 * `set_banner_image` téléverse AU DÉPÔT et la révision ne porte que la clé
 * obtenue (même raison que `add_product_images` : différer le téléchargement
 * à l'application ferait échouer « Appliquer » sur un lien mort, longtemps
 * après l'approbation). Le corollaire est que CHAQUE issue d'une révision
 * doit décider du sort d'un objet déjà en place :
 *
 *   rejetée    → l'objet déposé n'est plus nommé par rien → effacé
 *   appliquée  → c'est l'ANCIENNE image qui n'est plus nommée → effacée
 *   périmée    → ni appliquée ni rejetée un jour → effacée par l'apply sœur
 *
 * Et dans les trois cas, la même borne : ne jamais effacer l'objet que la
 * bannière AFFICHE. Un rejet qui viderait la vitrine serait pire que l'oubli
 * qu'il corrige.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
const storage = vi.hoisted(() => ({ deleteFromR2: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: storage.deleteFromR2, uploadToR2: vi.fn() }));

import { applyRevision, rejectRevision } from "@/lib/db/revisions";

const ADMIN = { id: "admin-1", name: "Admin" };
const VERSION = "2026-01-01 00:00:00";

let db: DatabaseSync;

function banniere(id: number, image: string | null) {
  db.prepare(
    `INSERT INTO banners (id, title, link_url, display_order, is_active, image_url, updated_at)
     VALUES (?, 'Bannière', '/x', 0, 1, ?, ?)`,
  ).run(id, image, VERSION);
}

function revision(id: string, bannerId: number, payload: Record<string, unknown>, statut = "pending") {
  db.prepare(
    `INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, status, base_version)
     VALUES (?, 'banner', ?, 'update', ?, 'mcp', 'admin-1', 'Admin', ?, ?)`,
  ).run(id, String(bannerId), JSON.stringify(payload), statut, VERSION);
}

const imageDe = (id: number) =>
  (db.prepare(`SELECT image_url FROM banners WHERE id = ?`).get(id) as { image_url: string | null }).image_url;

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  storage.deleteFromR2.mockClear();
});

describe("rejet d'une image de bannière", () => {
  it("efface l'objet déposé : plus rien ne le nommera jamais", async () => {
    banniere(1, "banners/1/ancienne.png");
    revision("rev-1", 1, { image_url: "banners/1/proposee.png" });

    await rejectRevision("rev-1", ADMIN);

    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/1/proposee.png");
    expect(storage.deleteFromR2).toHaveBeenCalledTimes(1);
    // Et surtout : l'image EN LIGNE est intacte.
    expect(imageDe(1)).toBe("banners/1/ancienne.png");
  });

  /**
   * Le cas qui justifie la relecture de la ligne. Si un payload porte la clé
   * que la bannière affiche déjà, l'effacer au rejet viderait la vitrine —
   * un rejet, qui ne doit RIEN changer, aurait cassé l'affichage.
   */
  it("n'efface jamais l'objet que la bannière affiche", async () => {
    banniere(1, "banners/1/en-ligne.png");
    revision("rev-1", 1, { image_url: "banners/1/en-ligne.png" });

    await rejectRevision("rev-1", ADMIN);

    expect(storage.deleteFromR2).not.toHaveBeenCalled();
  });

  it("un rejet qui ne touche pas à l'image n'efface rien", async () => {
    banniere(1, "banners/1/en-ligne.png");
    revision("rev-1", 1, { title: "Autre titre" });

    await rejectRevision("rev-1", ADMIN);

    expect(storage.deleteFromR2).not.toHaveBeenCalled();
  });
});

describe("rejet d'une CRÉATION de bannière", () => {
  function creation(id: string, bannerId: number) {
    db.prepare(
      `INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, status, base_version)
       VALUES (?, 'banner', ?, 'create', '{"content_html":"<p>x</p>"}', 'mcp', 'admin-1', 'Admin', 'pending', ?)`,
    ).run(id, String(bannerId), VERSION);
  }
  function banniereInactive(id: number) {
    db.prepare(
      `INSERT INTO banners (id, title, link_url, display_order, is_active, updated_at)
       VALUES (?, 'Nouvelle', '/x', 0, 0, ?)`,
    ).run(id, VERSION);
  }

  /**
   * Rejeter une création supprime la ligne et PÉRIME les révisions sœurs.
   * Une `superseded` ne sera plus jamais ni appliquée ni rejetée : l'image
   * qu'une sœur avait fait téléverser n'aurait plus aucun chemin vers
   * l'effacement. La bannière part avec la création, donc aucune de ces clés
   * n'est affichée nulle part.
   */
  it("efface l'image des sœurs que le rejet périme", async () => {
    banniereInactive(5);
    creation("rev-create", 5);
    revision("rev-image", 5, { image_url: "banners/5/jamais-vue.png" });

    await rejectRevision("rev-create", ADMIN);

    expect(db.prepare(`SELECT count(*) AS n FROM banners WHERE id = 5`).get()).toEqual({ n: 0 });
    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/5/jamais-vue.png");
  });

  // Si la bannière a été activée entre-temps, elle survit et les sœurs
  // restent `pending` : leurs images gardent leur chemin normal.
  it("n'efface rien si la bannière survit au rejet", async () => {
    banniereInactive(5);
    db.prepare(`UPDATE banners SET is_active = 1 WHERE id = 5`).run();
    creation("rev-create", 5);
    revision("rev-image", 5, { image_url: "banners/5/encore-utile.png" });

    await rejectRevision("rev-create", ADMIN);

    expect(db.prepare(`SELECT count(*) AS n FROM banners WHERE id = 5`).get()).toEqual({ n: 1 });
    expect(storage.deleteFromR2).not.toHaveBeenCalled();
  });
});

describe("application d'une image de bannière", () => {
  it("pose la nouvelle clé et efface l'ancienne, après le commit", async () => {
    banniere(1, "banners/1/ancienne.png");
    revision("rev-1", 1, { image_url: "banners/1/nouvelle.png" });

    await applyRevision("rev-1", ADMIN);

    expect(imageDe(1)).toBe("banners/1/nouvelle.png");
    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/1/ancienne.png");
    expect(storage.deleteFromR2).toHaveBeenCalledTimes(1);
  });

  it("une bannière sans image : rien à effacer", async () => {
    banniere(1, null);
    revision("rev-1", 1, { image_url: "banners/1/premiere.png" });

    await applyRevision("rev-1", ADMIN);

    expect(imageDe(1)).toBe("banners/1/premiere.png");
    expect(storage.deleteFromR2).not.toHaveBeenCalled();
  });

  // Reposer la même clé n'est pas un remplacement : l'effacer viderait
  // l'image que l'application vient de confirmer.
  it("une clé identique n'est pas effacée", async () => {
    banniere(1, "banners/1/meme.png");
    revision("rev-1", 1, { image_url: "banners/1/meme.png" });

    await applyRevision("rev-1", ADMIN);

    expect(imageDe(1)).toBe("banners/1/meme.png");
    expect(storage.deleteFromR2).not.toHaveBeenCalled();
  });

  it("retirer l'image (null) efface l'objet qu'elle montrait", async () => {
    banniere(1, "banners/1/ancienne.png");
    revision("rev-1", 1, { image_url: null });

    await applyRevision("rev-1", ADMIN);

    expect(imageDe(1)).toBeNull();
    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/1/ancienne.png");
  });

  /**
   * Une sœur périmée ne sera plus jamais ni appliquée ni rejetée
   * (`rejectRevision` refuse tout ce qui n'est pas `pending`) : son objet,
   * téléversé au dépôt, resterait dans R2 pour toujours.
   */
  it("efface aussi l'image des révisions sœurs que cette application périme", async () => {
    banniere(1, "banners/1/ancienne.png");
    revision("rev-1", 1, { image_url: "banners/1/retenue.png" });
    revision("rev-2", 1, { image_url: "banners/1/ecartee.png" });
    revision("rev-3", 1, { title: "Sans image" });

    const r = await applyRevision("rev-1", ADMIN);

    expect(r.superseded).toBe(2);
    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/1/ecartee.png");
    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/1/ancienne.png");
    expect(storage.deleteFromR2).not.toHaveBeenCalledWith("banners/1/retenue.png");
  });

  // Deux révisions peuvent proposer la MÊME clé (une reprise, un redépôt) :
  // périmer la seconde ne doit pas effacer ce que la première vient de poser.
  it("une sœur périmée portant la clé que cette application pose ne la fait pas effacer", async () => {
    banniere(1, null);
    revision("rev-1", 1, { image_url: "banners/1/partagee.png" });
    revision("rev-2", 1, { image_url: "banners/1/partagee.png" });

    await applyRevision("rev-1", ADMIN);

    expect(imageDe(1)).toBe("banners/1/partagee.png");
    expect(storage.deleteFromR2).not.toHaveBeenCalled();
  });
});
