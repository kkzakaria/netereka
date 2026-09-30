import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * Le retrait (§ 2.6), exécuté contre un vrai SQLite au schéma des migrations :
 * chaque consequence de l'écran est comptée par une vraie requête sur la vraie
 * table, et le batch d'`applyRevision` est réellement rejoué. Un compte qui
 * interrogerait la mauvaise table renverrait 0 ici — c'est ce que ces tests
 * existent pour attraper, le mock D1 ne l'aurait jamais vu.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

import { createRevision, applyRevision, rejectRevision, RevisionError } from "@/lib/db/revisions";
import {
  bannerWindow,
  getBannerWithdrawImpact,
  getProductWithdrawImpact,
  getWithdrawImpact,
} from "@/lib/db/withdraw-impact";

const ACTOR = { id: "mcp-1", name: "Assistant" };
const ADMIN = { id: "admin-1", name: "Admin" };
const NOW = "2026-10-01 12:00:00";

let db: DatabaseSync;

function seedCatalogue() {
  db.exec(`
    INSERT INTO categories (id, name, slug, parent_id) VALUES
      ('c-parent', 'Téléphones', 'telephones', NULL),
      ('c-child', 'Smartphones', 'smartphones', 'c-parent');
    INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_featured, is_draft, stock_quantity)
      VALUES ('p1', 'c-child', 'Galaxy S24', 'galaxy-s24', 500000, 1, 1, 0, 12),
             ('p-draft', 'c-child', 'Brouillon', 'brouillon', 1000, 0, 0, 1, 0),
             ('p-off', 'c-child', 'Déjà retiré', 'deja-retire', 1000, 0, 0, 0, 0),
             ('p-quiet', 'c-parent', 'Sans histoire', 'sans-histoire', 1000, 1, 0, 0, 0);
    INSERT INTO product_variants (id, product_id, name, price, stock_quantity, is_active)
      VALUES ('v1', 'p1', 'Noir', 500000, 7, 1), ('v2', 'p1', 'Blanc', 500000, 5, 1), ('v3', 'p1', 'Vieux', 1, 0, 0);
  `);
  const order = (id: string, status: string) =>
    db.prepare(`INSERT INTO orders (id, user_id, order_number, status, subtotal, delivery_fee, total, delivery_address, delivery_commune, delivery_phone)
                VALUES (?, 'u1', ?, ?, 1, 1, 2, 'a', 'c', 'p')`).run(id, `N-${id}`, status);
  const item = (id: string, orderId: string, productId: string) =>
    db.prepare(`INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, 'x', 1, 1, 1)`).run(id, orderId, productId);
  order("o1", "pending"); order("o2", "shipping"); order("o3", "delivered"); order("o4", "cancelled"); order("o5", "delivered");
  // o1 porte DEUX lignes du même produit : une commande, pas deux.
  item("i1", "o1", "p1"); item("i1b", "o1", "p1");
  item("i2", "o2", "p1"); item("i3", "o3", "p1"); item("i4", "o4", "p1");
  item("i5", "o5", "p-quiet"); // autre produit : ne doit compter nulle part pour p1
  db.exec(`
    INSERT INTO wishlist (id, user_id, product_id) VALUES ('w1', 'u1', 'p1'), ('w2', 'u2', 'p1'), ('w3', 'u1', 'p-quiet');
    INSERT INTO whatsapp_carts (id, session_id, product_id, quantity) VALUES ('wc1', 's1', 'p1', 1), ('wc2', 's1', 'p1', 2), ('wc3', 's2', 'p1', 1);
  `);
}

function seedBanners() {
  const ins = db.prepare(`INSERT INTO banners (id, title, link_url, is_active, display_order, starts_at, ends_at) VALUES (?, ?, '/x', ?, ?, ?, ?)`);
  ins.run(1, "Première", 1, 0, null, null);
  ins.run(2, "Seconde", 1, 1, null, null);
  ins.run(3, "Expirée", 1, 2, null, "2026-09-01 00:00:00");
  ins.run(4, "Programmée", 1, 3, "2026-12-01 00:00:00", null);
  ins.run(5, "Éteinte", 0, 4, null, null);
}

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  seedCatalogue();
  seedBanners();
});

describe("conséquences mesurées d'un retrait de produit", () => {
  it("compte les commandes par order_items.product_id, distinctes, dont celles en cours", async () => {
    const impact = await getProductWithdrawImpact("p1");
    // o1 (2 lignes), o2, o3, o4 = 4 commandes distinctes ; o5 référence un autre produit.
    expect(impact?.orders_total).toBe(4);
    // en cours : pending (o1) et shipping (o2) — pas delivered, pas cancelled.
    expect(impact?.orders_open).toBe(2);
  });

  it("compte envies, paniers WhatsApp (sessions distinctes) et variantes actives", async () => {
    const impact = await getProductWithdrawImpact("p1");
    expect(impact?.wishlist_count).toBe(2);
    expect(impact?.whatsapp_cart_count).toBe(2); // s1 (2 lignes) + s2
    expect(impact?.active_variant_count).toBe(2); // v3 inactive exclue
    expect(impact?.stock_quantity).toBe(12);
  });

  it("donne la catégorie puis ses ancêtres : la page parente liste aussi le produit", async () => {
    const impact = await getProductWithdrawImpact("p1");
    expect(impact?.category_trail.map((c) => c.slug)).toEqual(["smartphones", "telephones"]);
    const root = await getProductWithdrawImpact("p-quiet");
    expect(root?.category_trail.map((c) => c.slug)).toEqual(["telephones"]);
  });

  it("compte les bannières affichées à cet instant, avec la condition du carrousel", async () => {
    // Semées : 1 et 2 affichables ; 3 expirée, 4 programmée, 5 éteinte — mais « maintenant » est l'horloge réelle.
    db.exec("UPDATE banners SET ends_at = NULL, starts_at = NULL WHERE id IN (3, 4)");
    const impact = await getProductWithdrawImpact("p1");
    expect(impact?.displayed_banner_count).toBe(4); // 1-4 affichées, 5 éteinte
    db.exec("UPDATE banners SET is_active = 0");
    expect((await getProductWithdrawImpact("p1"))?.displayed_banner_count).toBe(0);
  });

  it("signale « en vedette » : 1 pour p1, 0 pour un produit ordinaire", async () => {
    expect((await getProductWithdrawImpact("p1"))?.is_featured).toBe(true);
    expect((await getProductWithdrawImpact("p-quiet"))?.is_featured).toBe(false);
  });

  it("un produit sans attaches affiche des zéros MESURÉS, pas une absence de donnée", async () => {
    const impact = await getProductWithdrawImpact("p-quiet");
    expect(impact).toMatchObject({ orders_total: 1, orders_open: 0, wishlist_count: 1, whatsapp_cart_count: 0 });
  });

  it("renvoie null pour une cible inexistante", async () => {
    expect(await getProductWithdrawImpact("nope")).toBeNull();
    expect(await getWithdrawImpact("banner", "abc")).toBeNull();
  });
});

describe("conséquences mesurées d'un retrait de bannière", () => {
  it("donne son rang dans le carrousel tel que la vitrine l'affiche", async () => {
    const impact = await getBannerWithdrawImpact(2, NOW);
    // Affichées à NOW : 1 et 2 (3 expirée, 4 programmée, 5 éteinte).
    expect(impact).toMatchObject({ displayed_now: true, position: 2, displayed_total: 2, displayed_after: 1, window: "live" });
  });

  it("une bannière expirée n'est pas affichée : son retrait ne change rien au carrousel", async () => {
    const impact = await getBannerWithdrawImpact(3, NOW);
    expect(impact).toMatchObject({ displayed_now: false, position: null, displayed_after: 2, window: "expired" });
  });

  it("distingue programmée et éteinte", async () => {
    expect((await getBannerWithdrawImpact(4, NOW))?.window).toBe("scheduled");
    expect((await getBannerWithdrawImpact(5, NOW))?.window).toBe("inactive");
  });

  it("retirer la dernière bannière affichée laisse 0 : le hero bascule sur les produits en vedette", async () => {
    db.exec("UPDATE banners SET is_active = 0 WHERE id = 1");
    const impact = await getBannerWithdrawImpact(2, NOW);
    expect(impact).toMatchObject({ position: 1, displayed_total: 1, displayed_after: 0 });
  });
});

describe("bannerWindow (pure)", () => {
  it("compare comme la vitrine : fin atteinte = expirée, début futur = programmée", () => {
    const row = { is_active: true, starts_at: null, ends_at: null };
    expect(bannerWindow(row, NOW)).toBe("live");
    expect(bannerWindow({ ...row, ends_at: NOW }, NOW)).toBe("expired");
    expect(bannerWindow({ ...row, starts_at: "2026-10-02 00:00:00" }, NOW)).toBe("scheduled");
    expect(bannerWindow({ ...row, is_active: false }, NOW)).toBe("inactive");
  });
});

describe("dépôt d'un retrait", () => {
  const deposit = (target: "product" | "banner", targetId: string, payload: Record<string, unknown> = {}) =>
    createRevision({ target, targetId, kind: "withdraw", payload, origin: "mcp", actor: ACTOR });

  it("dépose sur un produit en ligne", async () => {
    const { revisionId } = await deposit("product", "p1");
    const row = db.prepare("SELECT kind, status FROM content_revisions WHERE id = ?").get(revisionId);
    expect(row).toMatchObject({ kind: "withdraw", status: "pending" });
  });

  it("refuse un brouillon (rien à retirer) et un produit déjà retiré", async () => {
    await expect(deposit("product", "p-draft")).rejects.toMatchObject({ code: "validation_error" });
    await expect(deposit("product", "p-off")).rejects.toMatchObject({ code: "conflict" });
  });

  // Sans ce contrôle au dépôt, un `publish` sur une fiche retirée la remettait
  // en ligne sans saisie : la règle ne vivait que dans l'outil publish_product.
  it("refuse un publish sur une fiche déjà publiée ou retirée, quel que soit l'appelant", async () => {
    const publish = (id: string) =>
      createRevision({ target: "product", targetId: id, kind: "publish", payload: {}, origin: "mcp", actor: ACTOR });
    await expect(publish("p-off")).rejects.toMatchObject({ code: "conflict", message: expect.stringContaining("reactivate") });
    await expect(publish("p1")).rejects.toMatchObject({ code: "conflict" });
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });

  it("accepte toujours un publish sur un brouillon", async () => {
    const { revisionId } = await createRevision({ target: "product", targetId: "p-draft", kind: "publish", payload: {}, origin: "mcp", actor: ACTOR });
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(revisionId)).toEqual({ status: "pending" });
  });

  it("refuse une bannière déjà inactive", async () => {
    await expect(deposit("banner", "5")).rejects.toMatchObject({ code: "conflict" });
  });

  it("refuse un payload non vide — le retrait ne se dit pas dans le payload", async () => {
    await expect(deposit("product", "p1", { is_active: 0 })).rejects.toBeInstanceOf(RevisionError);
    await expect(deposit("banner", "1", { is_active: 0 })).rejects.toBeInstanceOf(RevisionError);
  });

  it("refuse is_active dans un update de bannière (l'exception du § 2.6 est refermée)", async () => {
    await expect(
      createRevision({ target: "banner", targetId: "1", kind: "update", payload: { is_active: 0 }, origin: "mcp", actor: ACTOR }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});

describe("application d'un retrait (batch réellement exécuté)", () => {
  it("refuse sans saisie, sans écrire quoi que ce soit", async () => {
    const { revisionId } = await createRevision({ target: "product", targetId: "p1", kind: "withdraw", payload: {}, origin: "mcp", actor: ACTOR });
    await expect(applyRevision(revisionId, ADMIN)).rejects.toMatchObject({ code: "validation_error" });
    await expect(applyRevision(revisionId, ADMIN, { confirmation: "oui" })).rejects.toMatchObject({ code: "validation_error" });
    expect(db.prepare("SELECT is_active FROM products WHERE id = 'p1'").get()).toEqual({ is_active: 1 });
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(revisionId)).toEqual({ status: "pending" });
  });

  it("avec le nom saisi : is_active = 0 et RIEN d'autre ne bouge", async () => {
    const before = db.prepare("SELECT * FROM products WHERE id = 'p1'").get() as Record<string, unknown>;
    const { revisionId } = await createRevision({ target: "product", targetId: "p1", kind: "withdraw", payload: {}, origin: "mcp", actor: ACTOR });
    await applyRevision(revisionId, ADMIN, { confirmation: "  galaxy  S24 " });
    const after = db.prepare("SELECT * FROM products WHERE id = 'p1'").get() as Record<string, unknown>;
    expect(after.is_active).toBe(0);
    const untouched = (row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).filter(([k]) => k !== "is_active" && k !== "updated_at"));
    expect(untouched(after)).toEqual(untouched(before)); // is_draft, is_featured, stock, contenu : intacts
    expect(db.prepare("SELECT COUNT(*) n FROM product_variants WHERE product_id = 'p1'").get()).toEqual({ n: 3 });
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(revisionId)).toEqual({ status: "applied" });
  });

  it("retire une bannière avec son titre, sans toucher à son contenu", async () => {
    const { revisionId } = await createRevision({ target: "banner", targetId: "2", kind: "withdraw", payload: {}, origin: "mcp", actor: ACTOR });
    await applyRevision(revisionId, ADMIN, { confirmation: "seconde" });
    expect(db.prepare("SELECT is_active, title, display_order FROM banners WHERE id = 2").get())
      .toEqual({ is_active: 0, title: "Seconde", display_order: 1 });
  });
});

describe("rejeter une création de bannière", () => {
  async function deposeCreate() {
    db.exec(`INSERT INTO banners (id, title, link_url, is_active, display_order) VALUES (9, 'Neuve', '/n', 0, 9)`);
    return createRevision({ target: "banner", targetId: "9", kind: "create", payload: {}, origin: "mcp", actor: ACTOR });
  }

  it("supprime la ligne inactive laissée par create_banner", async () => {
    const { revisionId } = await deposeCreate();
    await rejectRevision(revisionId, ADMIN);
    expect(db.prepare("SELECT COUNT(*) n FROM banners WHERE id = 9").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(revisionId)).toEqual({ status: "rejected" });
    const audit = db.prepare("SELECT details FROM audit_log WHERE action = 'revision.rejected'").get() as { details: string };
    expect(JSON.parse(audit.details).banner_row_removed).toBe(true);
  });

  it("ne supprime jamais une bannière devenue active", async () => {
    const { revisionId } = await deposeCreate();
    db.exec("UPDATE banners SET is_active = 1 WHERE id = 9");
    await rejectRevision(revisionId, ADMIN);
    expect(db.prepare("SELECT COUNT(*) n FROM banners WHERE id = 9").get()).toEqual({ n: 1 });
  });

  it("périme les révisions sœurs en attente sur la ligne supprimée", async () => {
    const { revisionId } = await deposeCreate();
    const sister = await createRevision({ target: "banner", targetId: "9", kind: "update", payload: { title: "Autre" }, origin: "mcp", actor: ACTOR });
    await rejectRevision(revisionId, ADMIN);
    expect(db.prepare("SELECT status FROM content_revisions WHERE id = ?").get(sister.revisionId)).toEqual({ status: "superseded" });
  });

  it("rejeter une modification ne supprime jamais la bannière", async () => {
    const r = await createRevision({ target: "banner", targetId: "5", kind: "update", payload: { title: "Autre" }, origin: "mcp", actor: ACTOR });
    await rejectRevision(r.revisionId, ADMIN);
    expect(db.prepare("SELECT COUNT(*) n FROM banners WHERE id = 5").get()).toEqual({ n: 1 });
  });
});
