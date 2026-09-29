import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => {
  return { current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> };
});
const storageMocks = vi.hoisted(() => ({ deleteFromR2: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: storageMocks.deleteFromR2, uploadToR2: vi.fn() }));

import { applyRevision } from "@/lib/db/revisions";

beforeEach(() => {
  d1.current = createD1Mock();
  storageMocks.deleteFromR2.mockClear();
});

const ADMIN = { id: "admin-9", name: "Admin Neuf" };

/**
 * Copie locale et minimale de `revisionRow`/des sondes de `revisions.test.ts` :
 * un doublon volontaire plutôt qu'un import partagé, pour que ce fichier
 * reste lisible seul — c'est un test d'intégration, pas une unité de plus
 * dans la même suite.
 */
function revisionRow(overrides: Record<string, unknown> = {}): unknown[] {
  const defaults: Record<string, unknown> = {
    id: "rev-1",
    target_type: "product",
    target_id: "p1",
    kind: "update",
    payload: JSON.stringify({}),
    origin: "mcp",
    actor_id: "mcp-1",
    actor_name: "Assistant MCP",
    summary: null,
    status: "pending",
    base_version: "2026-01-01 00:00:00",
    created_at: "2026-01-01 00:00:00",
    resolved_at: null,
    resolved_by: null,
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.id, merged.target_type, merged.target_id, merged.kind, merged.payload,
    merged.origin, merged.actor_id, merged.actor_name, merged.summary, merged.status,
    merged.base_version, merged.created_at, merged.resolved_at, merged.resolved_by,
  ];
}

const isGetRevisionSelect = (sql: string) => /^select "id", "target_type"/.test(sql);
const isProductVersionSelect = (sql: string) => /^select "updated_at" from "products"/.test(sql);
const isOthersSelect = (sql: string) => /^select "id", "kind", "payload" from "content_revisions"/.test(sql);

/**
 * Schéma minimal, fidèle aux colonnes réellement référencées par le SQL
 * qu'`applyRevision` émet pour `add_images`/`remove_image`/`set_variants` —
 * `lib/db/schema.ts` reste la source de vérité complète, celui-ci n'existe
 * que pour faire tourner ces statements précis contre un vrai moteur.
 */
function createRealDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE "products" (
      "id" TEXT PRIMARY KEY,
      "updated_at" TEXT NOT NULL,
      "stock_quantity" INTEGER NOT NULL DEFAULT 0,
      "base_price" INTEGER NOT NULL DEFAULT 0,
      "compare_price" INTEGER
    );
    CREATE TABLE "product_images" (
      "id" TEXT PRIMARY KEY,
      "product_id" TEXT NOT NULL,
      "variant_id" TEXT,
      "url" TEXT NOT NULL,
      "alt" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "is_primary" INTEGER NOT NULL DEFAULT 0,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE "product_variants" (
      "id" TEXT PRIMARY KEY,
      "product_id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "sku" TEXT,
      "price" INTEGER NOT NULL,
      "compare_price" INTEGER,
      "stock_quantity" INTEGER NOT NULL DEFAULT 0,
      "attributes" TEXT NOT NULL DEFAULT '{}',
      "is_active" INTEGER NOT NULL DEFAULT 1,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE "content_revisions" (
      "id" TEXT PRIMARY KEY,
      "target_type" TEXT NOT NULL,
      "target_id" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'update',
      "payload" TEXT NOT NULL,
      "origin" TEXT NOT NULL,
      "actor_id" TEXT NOT NULL,
      "actor_name" TEXT NOT NULL,
      "summary" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "base_version" TEXT,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
      "resolved_at" TEXT,
      "resolved_by" TEXT
    );
    CREATE TABLE "audit_log" (
      "id" TEXT PRIMARY KEY,
      "actor_id" TEXT NOT NULL,
      "actor_name" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "target_type" TEXT NOT NULL,
      "target_id" TEXT NOT NULL,
      "details" TEXT,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

/**
 * Rejoue, DANS L'ORDRE, les instructions qu'`applyRevision` a réellement
 * construites pour son `db.batch()` — capturées via le mock D1 — contre un
 * vrai moteur SQLite (`node:sqlite`, disponible nativement depuis Node 22).
 *
 * C'est le point que la revue de phase a identifié comme décisif :
 * `__tests__/helpers/d1-mock.ts` s'arrête un cran sous Drizzle et n'exécute
 * JAMAIS le SQL qu'il compile — les assertions des autres tests de ce fichier
 * portent sur le TEXTE émis (regex sur `.sql`, contenu de `.params`), jamais
 * sur son EFFET. Le round 1 de B1 avait ainsi pu ajouter une garde de version
 * présente et correcte dans le texte de chaque écriture enfant, tout en la
 * plaçant dans le batch APRÈS `targetStatement` — qui avait déjà avancé
 * `products.updated_at` au moment où ces gardes s'exécutaient, puisqu'un
 * batch D1 est une transaction SQL séquentielle où chaque instruction voit
 * les effets des précédentes. Résultat : la garde ne matchait plus JAMAIS,
 * sur le chemin normal, sans la moindre course — invisible tant que rien
 * n'exécute réellement le batch dans l'ordre.
 */
function replay(db: DatabaseSync, stmts: BoundStatement[]): void {
  for (const s of stmts) {
    db.prepare(s.sql).run(...(s.params as (string | number | bigint | null)[]));
  }
}

describe("applyRevision — exécution réelle du batch (node:sqlite), chemin normal sans course", () => {
  it("[SQLITE RÉEL] add_images : l'image atterrit vraiment, pas seulement son garde-fou textuel", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({
          kind: "add_images",
          payload: JSON.stringify({ images: [{ key: "products/p1/a.jpg", alt: null }] }),
        })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/^select count\(\*\) from "product_images"/i.test(stmt.sql)) return [[0]];
      if (/"product_images"\."id" in/i.test(stmt.sql)) return stmt.params.map((p) => [p]);
      return [];
    });

    await applyRevision("rev-1", ADMIN);
    const stmts = d1.current!.batchStatements();

    const real = createRealDb();
    real.exec(`INSERT INTO "products" ("id", "updated_at") VALUES ('p1', '2026-01-01 00:00:00')`);

    replay(real, stmts);

    const images = real.prepare(`SELECT "id", "url" FROM "product_images" WHERE "product_id" = 'p1'`).all();
    // C'est EXACTEMENT le symptôme reproduit en revue de phase (round 2) :
    // avant le correctif d'ordre, cette ligne valait 0 sur le chemin normal,
    // sans la moindre course — l'application rapportait pourtant un succès
    // (`targetStatement`, exécuté en premier, matchait bien lui) et marquait
    // la révision `applied`, rendant l'objet R2 déjà téléversé orphelin pour
    // toujours (le rejet refuse désormais une révision `applied`).
    expect(images).toHaveLength(1);
    expect((images[0] as { url: string }).url).toBe("products/p1/a.jpg");

    const product = real.prepare(`SELECT "updated_at" FROM "products" WHERE "id" = 'p1'`).get() as { updated_at: string };
    expect(product.updated_at).not.toBe("2026-01-01 00:00:00");

    real.close();
  });

  it("[SQLITE RÉEL] remove_image : la ligne disparaît vraiment, pas seulement son garde-fou textuel", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({ kind: "remove_image", payload: JSON.stringify({ image_id: "img-1" }) })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/from "product_images"/i.test(stmt.sql)) return [["img-1", "products/p1/old.jpg", 0]];
      return [];
    });

    await applyRevision("rev-1", ADMIN);
    const stmts = d1.current!.batchStatements();

    const real = createRealDb();
    real.exec(`INSERT INTO "products" ("id", "updated_at") VALUES ('p1', '2026-01-01 00:00:00')`);
    real.exec(
      `INSERT INTO "product_images" ("id", "product_id", "url", "is_primary") VALUES ('img-1', 'p1', 'products/p1/old.jpg', 0)`,
    );

    replay(real, stmts);

    // Avant le correctif d'ordre : cette ligne SURVIVAIT (le DELETE, exécuté
    // après que `targetStatement` a bougé `products.updated_at`, ne matchait
    // plus rien) alors que l'application rapportait un succès et que
    // `afterCommit` — à l'époque ancré sur `targetResult`, pas sur le DELETE
    // lui-même — effaçait quand même l'objet R2 : une image cassée sur une
    // fiche en ligne (ligne en base, fichier détruit).
    const remaining = real.prepare(`SELECT "id" FROM "product_images" WHERE "id" = 'img-1'`).all();
    expect(remaining).toHaveLength(0);

    real.close();
  });

  it("[SQLITE RÉEL] set_variants : la variante atterrit et le stock du produit reflète réellement sa somme", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({
          kind: "set_variants",
          payload: JSON.stringify({
            variants: [{ color_name: "Noir", color_hex: "#000000", price: null, stock: 5 }],
            uniform_price: true,
          }),
        })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/^select "base_price", "compare_price" from "products"/i.test(stmt.sql)) return [[100000, null]];
      if (/from "product_variants"/i.test(stmt.sql)) return [];
      return [];
    });

    await applyRevision("rev-1", ADMIN);
    const stmts = d1.current!.batchStatements();

    const real = createRealDb();
    real.exec(`INSERT INTO "products" ("id", "updated_at", "base_price") VALUES ('p1', '2026-01-01 00:00:00', 100000)`);

    replay(real, stmts);

    const variants = real
      .prepare(`SELECT "name", "price", "stock_quantity" FROM "product_variants" WHERE "product_id" = 'p1'`)
      .all() as { name: string; price: number; stock_quantity: number }[];
    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({ name: "Noir", price: 100000, stock_quantity: 5 });

    const product = real.prepare(`SELECT "stock_quantity" FROM "products" WHERE "id" = 'p1'`).get() as {
      stock_quantity: number;
    };
    // Le stock du produit doit être la somme RÉELLE des variantes qui ont
    // RÉELLEMENT atterri, pas seulement ce que `targetStatement` a écrit en
    // aveugle. Avant le correctif d'ordre : cette valeur aurait été 5 alors
    // qu'AUCUNE variante n'existait en base — le mode de défaillance que B1
    // décrivait à l'origine (stock désynchronisé de ses propres variantes,
    // sur une boutique en paiement à la livraison), rendu déterministe par
    // l'inversion.
    const sumOfVariants = variants.reduce((s, v) => s + v.stock_quantity, 0);
    expect(product.stock_quantity).toBe(sumOfVariants);
    expect(product.stock_quantity).toBe(5);

    real.close();
  });
});
