import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";
import type { McpContext } from "@/lib/mcp/context";

/**
 * `list_banners` vu de l'outil, contre un vrai SQLite.
 *
 * Pas le mock D1 de `tools-banners.test.ts` : sous Drizzle il ne rend que des
 * lignes POSITIONNELLES forgées à la main, donc une colonne lue au mauvais
 * rang y passe inaperçue (`payload` arrivait `undefined`, et l'outil rendait
 * un `internal_error` au lieu de la liste).
 *
 * Ce que ce fichier vérifie et que `list-banners.test.ts` ne peut pas : le
 * RATTACHEMENT des révisions en attente à leur bannière. C'est lui qui dit à
 * l'appelant qu'une modification est déjà déposée avant qu'il n'en dépose une
 * seconde — l'assistant du 2026-10-02 le vérifiait à la main après coup.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));

import { bannerTools } from "@/lib/mcp/tools/banners";
import { listPendingRevisionHandles } from "@/lib/db/revisions";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
const listBannersTool = bannerTools.find((t) => t.name === "list_banners")!;
const appel = async () => JSON.parse((await listBannersTool.handler(ctx, {} as never)).content[0].text);

let db: DatabaseSync;

function banniere(id: number, titre: string, ordre: number, active = 1) {
  db.prepare(
    `INSERT INTO banners (id, title, link_url, display_order, is_active) VALUES (?, ?, '/x', ?, ?)`,
  ).run(id, titre, ordre, active);
}

function revision(id: string, cible: number, statut = "pending", kind = "update") {
  db.prepare(
    `INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, status, created_at)
     VALUES (?, 'banner', ?, ?, '{"title":"x"}', 'mcp', 'admin-1', 'Admin', ?, '2026-10-02 10:00:00')`,
  ).run(id, String(cible), kind, statut);
}

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
});

describe("list_banners : les révisions en attente, rattachées à leur bannière", () => {
  it("chaque révision va à SA bannière, et à aucune autre", async () => {
    banniere(7, "Sept", 0);
    banniere(9, "Neuf", 1);
    revision("rev-a", 7);
    revision("rev-b", 7, "pending", "withdraw");
    revision("rev-c", 9);

    const out = await appel();

    expect(out.banners.find((b: { id: number }) => b.id === 7).pending_revisions)
      .toEqual(expect.arrayContaining([{ id: "rev-a", kind: "update" }, { id: "rev-b", kind: "withdraw" }]));
    expect(out.banners.find((b: { id: number }) => b.id === 9).pending_revisions)
      .toEqual([{ id: "rev-c", kind: "update" }]);
  });

  it("une bannière sans révision porte une liste vide, pas un trou", async () => {
    banniere(7, "Sept", 0);
    const [b] = (await appel()).banners;
    expect(b.pending_revisions).toEqual([]);
  });

  // Une révision déjà tranchée n'est plus « en attente » : l'annoncer ferait
  // croire à un dépôt en cours et retiendrait l'appelant d'écrire.
  it("une révision appliquée ou rejetée n'est pas annoncée", async () => {
    banniere(7, "Sept", 0);
    revision("rev-ok", 7, "applied");
    revision("rev-no", 7, "rejected");
    const [b] = (await appel()).banners;
    expect(b.pending_revisions).toEqual([]);
  });

  // Les révisions produit vivent dans la même table, avec les mêmes
  // identifiants numériques côté cible. Sans le filtre sur target_type, la
  // révision du produit « 7 » s'afficherait sur la bannière 7.
  it("une révision de PRODUIT ne remonte pas sur la bannière de même numéro", async () => {
    banniere(7, "Sept", 0);
    db.prepare(
      `INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, status)
       VALUES ('rev-p', 'product', '7', 'update', '{}', 'mcp', 'admin-1', 'Admin', 'pending')`,
    ).run();
    const [b] = (await appel()).banners;
    expect(b.pending_revisions).toEqual([]);
  });

  /**
   * Une révision porte le `content_html` proposé dans son `payload` — jusqu'à
   * 512 Ko, et leur nombre n'est borné par rien. La liste n'en garde que l'id
   * et le genre ; les charger pour les jeter ferait grossir la réponse D1 avec
   * la file d'attente.
   */
  it("le payload d'une révision ne traverse pas le fil", async () => {
    banniere(7, "Sept", 0);
    db.prepare(
      `INSERT INTO content_revisions (id, target_type, target_id, kind, payload, origin, actor_id, actor_name, status)
       VALUES ('rev-lourde', 'banner', '7', 'update', '{"content_html":"<div>charge utile</div>"}', 'mcp', 'a', 'A', 'pending')`,
    ).run();
    const out = await appel();
    expect(JSON.stringify(out)).not.toContain("charge utile");
    expect(out.banners[0].pending_revisions).toEqual([{ id: "rev-lourde", kind: "update" }]);

    // Et il n'est pas seulement écarté de la réponse : il n'est pas LU.
    // Ce que l'assertion ci-dessus ne prouve pas — le gestionnaire ne garde
    // que l'id et le genre, quelle que soit la requête.
    const handles = await listPendingRevisionHandles("banner");
    expect(Object.keys(handles[0]).sort()).toEqual(["id", "kind", "target_id"]);
  });
});

describe("list_banners : les compteurs de l'en-tête", () => {
  it("count compte tout, displayed_count les seules affichées", async () => {
    banniere(1, "Affichée", 0);
    banniere(2, "Masquée", 1, 0);
    banniere(3, "Affichée aussi", 2);

    const out = await appel();

    expect(out.count).toBe(3);
    expect(out.displayed_count).toBe(2);
  });

  it("aucune bannière : une liste vide et des compteurs à zéro, pas une erreur", async () => {
    expect(await appel()).toEqual({ banners: [], count: 0, displayed_count: 0 });
  });

  /**
   * L'ensemble des clés qui traversent le fil MCP, figé. Le `not.toContain`
   * ci-dessous ne surveille qu'une valeur ; celui-ci verrait passer un champ
   * ajouté par mégarde, HTML ou non.
   */
  it("la réponse ne porte que ces champs, par bannière et à la racine", async () => {
    banniere(1, "Une", 0);
    const out = await appel();
    expect(Object.keys(out).sort()).toEqual(["banners", "count", "displayed_count"]);
    expect(Object.keys(out.banners[0]).sort()).toEqual([
      "carousel_position", "display_order", "ends_at", "has_content_html", "has_image",
      "id", "is_active", "link_url", "not_displayed_because", "pending_revisions",
      "starts_at", "title",
    ]);
  });

  // Le contenu HTML monte à 512 Ko par bannière : l'outil en rend le drapeau,
  // jamais le texte. Vérifié ici aussi parce que c'est la réponse MCP, celle
  // qui traverse le fil.
  it("la réponse ne transporte jamais le HTML", async () => {
    banniere(1, "Avec", 0);
    db.prepare(`UPDATE banners SET content_html = '<div class="nk-banner">Beaucoup</div>' WHERE id = 1`).run();
    const out = await appel();
    expect(JSON.stringify(out)).not.toContain("nk-banner");
    expect(out.banners[0].has_content_html).toBe(true);
  });
});
