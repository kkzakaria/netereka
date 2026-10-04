import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../helpers/sqlite-d1";
import { mockAdminSession } from "../../helpers/mocks";

/**
 * `deleteBanner`, contre un vrai SQLite.
 *
 * Cette porte n'avait AUCUN test : c'est ce qui l'a laissée effacer l'objet
 * R2 AVANT la ligne (un échec de la base laissait la bannière en ligne
 * désigner une clé supprimée), et laisser derrière elle des révisions en
 * attente sur une cible disparue — leur écran de détail est un 404, donc ni
 * applicables ni rejetables, et l'image que `set_banner_image` leur avait
 * fait téléverser n'avait plus aucun chemin vers l'effacement.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteFromR2: vi.fn().mockResolvedValue(undefined),
  redirect: vi.fn((url: string): never => {
    const e = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    e.digest = `NEXT_REDIRECT;${url}`;
    throw e;
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/cloudflare/hero-preload", () => ({ refreshHeroPreload: vi.fn() }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: mocks.deleteFromR2, uploadToR2: vi.fn() }));

import { deleteBanner } from "@/actions/admin/banners";

let db: DatabaseSync;

function banniere(id: number, image: string | null) {
  db.prepare(
    `INSERT INTO banners (id, title, link_url, display_order, is_active, image_url)
     VALUES (?, 'Bannière', '/x', 0, 1, ?)`,
  ).run(id, image);
}
function revision(id: string, bannerId: number, payload: Record<string, unknown>, statut = "pending") {
  db.prepare(
    `INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, status)
     VALUES (?, 'banner', ?, 'update', ?, 'mcp', 'a', 'A', ?)`,
  ).run(id, String(bannerId), JSON.stringify(payload), statut);
}
const statutDe = (id: string) =>
  (db.prepare(`SELECT status FROM content_revisions WHERE id = ?`).get(id) as { status: string }).status;

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  mocks.getSession.mockResolvedValue(mockAdminSession);
  mocks.deleteFromR2.mockReset().mockResolvedValue(undefined);
});

describe("deleteBanner", () => {
  it("supprime la ligne et efface son image", async () => {
    banniere(1, "banners/1-abc.png");

    const r = await deleteBanner(1);

    expect(r.success).toBe(true);
    expect(db.prepare(`SELECT count(*) AS n FROM banners`).get()).toEqual({ n: 0 });
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/1-abc.png");
  });

  it("bannière introuvable : rien n'est effacé", async () => {
    const r = await deleteBanner(99);
    expect(r.success).toBe(false);
    expect(mocks.deleteFromR2).not.toHaveBeenCalled();
  });

  it("une clé héritée /images/ est normalisée", async () => {
    banniere(1, "/images/banners/1-legacy.png");
    await deleteBanner(1);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/1-legacy.png");
  });

  /**
   * Une révision laissée `pending` sur une bannière supprimée ne peut plus
   * être ni appliquée ni rejetée : son image resterait dans R2 pour toujours.
   * Elle est donc périmée ET son objet effacé, comme au rejet d'une création.
   */
  it("périme les révisions en attente et libère leurs images", async () => {
    banniere(1, "banners/1-affichee.png");
    revision("rev-img", 1, { image_url: "banners/1/proposee.png" });
    revision("rev-texte", 1, { title: "Sans image" });

    await deleteBanner(1);

    expect(statutDe("rev-img")).toBe("superseded");
    expect(statutDe("rev-texte")).toBe("superseded");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/1/proposee.png");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/1-affichee.png");
  });

  it("ne touche ni aux révisions déjà tranchées ni à celles d'une autre bannière", async () => {
    banniere(1, null);
    banniere(2, null);
    revision("rev-appliquee", 1, { image_url: "banners/1/ancienne.png" }, "applied");
    revision("rev-voisine", 2, { image_url: "banners/2/autre.png" });

    await deleteBanner(1);

    expect(statutDe("rev-appliquee")).toBe("applied");
    expect(statutDe("rev-voisine")).toBe("pending");
    // L'image d'une révision APPLIQUÉE est celle que la bannière montrait :
    // elle a déjà été effacée en tant qu'image de la ligne, ou elle est
    // encore référencée ailleurs. Jamais effacée ici.
    expect(mocks.deleteFromR2).not.toHaveBeenCalledWith("banners/1/ancienne.png");
    expect(mocks.deleteFromR2).not.toHaveBeenCalledWith("banners/2/autre.png");
  });
});
