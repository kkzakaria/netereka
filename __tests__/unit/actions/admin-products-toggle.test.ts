import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../helpers/sqlite-d1";

/**
 * La bascule de la liste des produits, contre un vrai SQLite : l'écran du
 * retrait promet qu'un clic remet la fiche en ligne, donc ce clic doit
 * revalider la vitrine — sa page, l'accueil, la catégorie et ses parents.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

import { toggleProductActive } from "@/actions/admin/products";
import { productStorefrontPaths } from "@/lib/cache/revalidate-product";

let db: DatabaseSync;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ user: { id: "a", name: "A" } });
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  db.exec(`
    INSERT INTO categories (id, name, slug, parent_id) VALUES ('c-parent', 'Téléphones', 'telephones', NULL), ('c-child', 'Smartphones', 'smartphones', 'c-parent');
    INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft) VALUES
      ('p1', 'c-child', 'Galaxy', 'galaxy', 10, 1, 0), ('p-orphan', NULL, 'Sans catégorie', 'sans-categorie', 10, 1, 0);
  `);
});

describe("productStorefrontPaths", () => {
  it("donne la page, l'accueil, la catégorie puis ses ancêtres", async () => {
    expect(await productStorefrontPaths("p1")).toEqual(["/p/galaxy", "/", "/c/smartphones", "/c/telephones"]);
  });
  it("sans catégorie : la page et l'accueil seulement ; produit inconnu : rien", async () => {
    expect(await productStorefrontPaths("p-orphan")).toEqual(["/p/sans-categorie", "/"]);
    expect(await productStorefrontPaths("nope")).toEqual([]);
  });
});

describe("toggleProductActive", () => {
  it("bascule la fiche ET revalide la vitrine, pas seulement /products", async () => {
    const result = await toggleProductActive("p1");
    expect(result).toEqual({ success: true });
    expect(db.prepare("SELECT is_active FROM products WHERE id = 'p1'").get()).toEqual({ is_active: 0 });
    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(["/products", "/p/galaxy", "/", "/c/smartphones", "/c/telephones"]));
  });
});
