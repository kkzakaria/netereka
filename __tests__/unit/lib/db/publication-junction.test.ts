import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createD1Mock } from "../../../helpers/d1-mock";

/**
 * Test de JONCTION (§ 2.8 du spec) : on ne vérifie ni « applyRevision écrit
 * is_draft » ni « la vitrine filtre sur is_active » — chacun est vrai et
 * testé ailleurs. On vérifie que la fiche qu'un administrateur vient de
 * publier est RETROUVÉE par la vraie requête vitrine (`getProductBySlug`),
 * sur un vrai moteur SQLite. Le défaut de la phase 3 (une fiche publiée mais
 * invisible) n'existait dans aucune des deux couches.
 *
 * Deux liaisons D1 derrière le même `getDB` : le mock (qui capture le batch
 * qu'`applyRevision` construit) puis un adaptateur sur `node:sqlite` (qui
 * exécute ce batch et répond à la requête vitrine).
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

import { applyRevision } from "@/lib/db/revisions";
import { getProductBySlug } from "@/lib/db/products";

type SqlValue = string | number | bigint | null;

function sqliteBinding(db: DatabaseSync) {
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => db.prepare(sql).get(...(params as SqlValue[])) ?? null,
        all: async () => ({ results: db.prepare(sql).all(...(params as SqlValue[])) }),
      }),
    }),
  };
}

function storefrontDb(product: { is_draft: number; is_active: number }): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT, slug TEXT);
    CREATE TABLE products (
      id TEXT PRIMARY KEY, slug TEXT, name TEXT, category_id TEXT, updated_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1, is_draft INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE product_images (id TEXT PRIMARY KEY, product_id TEXT, sort_order INTEGER);
    CREATE TABLE product_variants (id TEXT PRIMARY KEY, product_id TEXT, price INTEGER, is_active INTEGER);
    CREATE TABLE product_attributes (id TEXT PRIMARY KEY, product_id TEXT, name TEXT);
    CREATE TABLE content_revisions (
      id TEXT PRIMARY KEY, target_type TEXT, target_id TEXT, kind TEXT, payload TEXT, origin TEXT,
      actor_id TEXT, actor_name TEXT, summary TEXT, status TEXT DEFAULT 'pending', base_version TEXT,
      created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT, resolved_by TEXT
    );
    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY, actor_id TEXT, actor_name TEXT, action TEXT, target_type TEXT,
      target_id TEXT, details TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO categories VALUES ('c1', 'Téléphones', 'telephones');
    INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, base_version)
      VALUES ('rev-1', 'product', 'p1', 'publish', '{}', 'mcp', 'mcp-1', 'Assistant', '2026-01-01 00:00:00');
  `);
  db.prepare(
    `INSERT INTO products (id, slug, name, category_id, updated_at, is_draft, is_active) VALUES ('p1', 'fiche', 'Fiche', 'c1', '2026-01-01 00:00:00', ?, ?)`,
  ).run(product.is_draft, product.is_active);
  return db;
}

async function publishOn(db: DatabaseSync): Promise<void> {
  const d1 = createD1Mock();
  d1.raw.mockImplementation(async (stmt) => {
    if (/^select "id", "target_type"/.test(stmt.sql)) {
      return [[
        "rev-1", "product", "p1", "publish", "{}", "mcp", "mcp-1", "Assistant", null, "pending",
        "2026-01-01 00:00:00", "2026-01-01 00:00:00", null, null,
      ]];
    }
    if (/^select "updated_at" from "products"/.test(stmt.sql)) return [["2026-01-01 00:00:00"]];
    return [];
  });
  holder.binding = d1.binding;
  await applyRevision("rev-1", { id: "admin-9", name: "Admin" });
  for (const s of d1.batchStatements()) db.prepare(s.sql).run(...(s.params as SqlValue[]));
  holder.binding = sqliteBinding(db);
}

beforeEach(() => {
  holder.binding = null;
});

describe("publication : la fiche publiée est visible en vitrine (is_draft ET is_active)", () => {
  it("[SQLITE RÉEL] un brouillon MCP (is_draft=1, is_active=0) publié est trouvé par getProductBySlug", async () => {
    const db = storefrontDb({ is_draft: 1, is_active: 0 });
    holder.binding = sqliteBinding(db);
    expect(await getProductBySlug("fiche")).toBeNull(); // avant : invisible, comme il se doit

    await publishOn(db);

    // Avant le correctif : is_draft = 0 mais is_active = 0 → null, alors que
    // l'administrateur avait cliqué Appliquer et que la révision était « applied ».
    const visible = await getProductBySlug("fiche");
    expect(visible?.id).toBe("p1");

    const row = db.prepare(`SELECT is_draft, is_active FROM products WHERE id = 'p1'`).get();
    expect(row).toMatchObject({ is_draft: 0, is_active: 1 });
    db.close();
  });
});
