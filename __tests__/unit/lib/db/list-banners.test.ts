import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * `listBanners`, contre un vrai SQLite au schéma des migrations.
 *
 * Elle existe parce qu'un assistant en service a brûlé trois échanges à
 * deviner un identifiant le 2026-10-02 : « la bannière 0 » désignait la
 * PREMIÈRE du carrousel, pas la bannière d'identifiant 0 — qui n'existe pas,
 * les identifiants commençant à 1. Le rang et l'identifiant sont deux choses
 * différentes, et c'est cette confusion que l'outil doit lever.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));

import { listBanners } from "@/lib/db/banners";
import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { bannerClock, displayedBannerCondition, displayedBannerOrder } from "@/lib/db/storefront/banners";

let db: DatabaseSync;

function banniere(o: {
  id: number; titre: string; ordre: number; active?: number;
  debut?: string | null; fin?: string | null; html?: string | null; image?: string | null;
}) {
  db.prepare(
    `INSERT INTO banners (id, title, link_url, display_order, is_active, starts_at, ends_at, content_html, image_url)
     VALUES (?, ?, '/x', ?, ?, ?, ?, ?, ?)`,
  ).run(o.id, o.titre, o.ordre, o.active ?? 1, o.debut ?? null, o.fin ?? null, o.html ?? null, o.image ?? null);
}

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
});

describe("listBanners : le rang du carrousel n'est pas l'identifiant", () => {
  it("numérote À PARTIR DE 1 les seules bannières affichées, dans l'ordre du carrousel", async () => {
    banniere({ id: 7, titre: "Première", ordre: 0 });
    banniere({ id: 2, titre: "Seconde", ordre: 1 });
    banniere({ id: 5, titre: "Troisième", ordre: 2 });

    const l = await listBanners();

    expect(l.map((b) => [b.carousel_position, b.id])).toEqual([[1, 7], [2, 2], [3, 5]]);
  });

  // Le cœur du malentendu : la première diapositive peut porter n'importe quel
  // identifiant. Dire « position 1 » sans dire « id 7 » ne sert à rien.
  it("une bannière inactive ne consomme pas de rang et ne décale pas les suivantes", async () => {
    banniere({ id: 1, titre: "Masquée", ordre: 0, active: 0 });
    banniere({ id: 7, titre: "Première visible", ordre: 1 });
    banniere({ id: 9, titre: "Seconde visible", ordre: 2 });

    const l = await listBanners();

    expect(l.find((b) => b.id === 1)).toMatchObject({ carousel_position: null, not_displayed_because: "inactive" });
    expect(l.find((b) => b.id === 7)?.carousel_position).toBe(1);
    expect(l.find((b) => b.id === 9)?.carousel_position).toBe(2);
  });
});

describe("listBanners : pourquoi une bannière ne s'affiche pas", () => {
  /**
   * Une bannière ACTIVE dont la fenêtre est passée ne s'affiche pas. Le dire
   * évite de chercher pourquoi une bannière « active » reste invisible — c'est
   * la même définition que le carrousel et que l'écran d'un retrait.
   */
  it("active mais terminée : pas de rang, et la raison le dit", async () => {
    banniere({ id: 1, titre: "Soldes finies", ordre: 0, fin: "2020-01-01 00:00:00" });
    const [b] = await listBanners();
    expect(b.is_active).toBe(true);
    expect(b.carousel_position).toBeNull();
    expect(b.not_displayed_because).toBe("terminée");
  });

  it("active mais pas encore commencée : la raison le distingue d'une fin", async () => {
    banniere({ id: 1, titre: "À venir", ordre: 0, debut: "2099-01-01 00:00:00" });
    const [b] = await listBanners();
    expect(b.not_displayed_because).toBe("pas encore commencée");
  });

  it("inactive l'emporte sur la fenêtre : une seule raison, la plus décisive", async () => {
    banniere({ id: 1, titre: "Les deux", ordre: 0, active: 0, fin: "2020-01-01 00:00:00" });
    const [b] = await listBanners();
    expect(b.not_displayed_because).toBe("inactive");
  });
});

describe("listBanners : ce qu'elle ne renvoie pas", () => {
  /**
   * `content_html` monte à 512 Ko par bannière. Le but est d'IDENTIFIER, pas
   * de relire — `get_banner` est là pour ça. Un drapeau suffit à savoir s'il y
   * a quelque chose à relire.
   */
  it("jamais le contenu HTML, seulement s'il y en a un", async () => {
    banniere({ id: 1, titre: "Avec", ordre: 0, html: "<div class=\"nk-banner\">Beaucoup de texte</div>" });
    banniere({ id: 2, titre: "Sans", ordre: 1, html: "   " });

    const l = await listBanners();

    expect(JSON.stringify(l)).not.toContain("nk-banner");
    expect(l.find((b) => b.id === 1)?.has_content_html).toBe(true);
    // Un blanc n'est pas un contenu.
    expect(l.find((b) => b.id === 2)?.has_content_html).toBe(false);
  });

  it("de même pour l'image : un drapeau, pas la clé", async () => {
    banniere({ id: 1, titre: "Avec", ordre: 0, image: "banners/1-abc.png" });
    banniere({ id: 2, titre: "Sans", ordre: 1 });
    const l = await listBanners();
    expect(l.find((b) => b.id === 1)?.has_image).toBe(true);
    expect(l.find((b) => b.id === 2)?.has_image).toBe(false);
  });

  it("rend une liste vide sans bannière, pas une erreur", async () => {
    expect(await listBanners()).toEqual([]);
  });
});

describe("listBanners : la même définition d'« affichée » que la vitrine", () => {
  /**
   * `displayedBannerCondition` se dit « LA définition » et met en garde contre
   * une condition écrite à part. `listBanners` en écrit pourtant une seconde,
   * en JavaScript, parce qu'elle doit dire LAQUELLE des trois causes empêche
   * l'affichage — un booléen rendu par SQL ne le dirait pas.
   *
   * Ce test est le couplage qui manquait : il compare les deux verdicts sur
   * les bornes exactes, horloge gelée. Si quelqu'un passe le `gt(ends_at)` du
   * SQL à un `gte`, ou le `<=` du JS à un `<`, les deux cessent de s'accorder
   * et c'est ici que ça rougit — pas sur la vitrine.
   */
  const MAINTENANT = "2026-06-15 12:00:00";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  async function affichéesSelonLaVitrine(): Promise<number[]> {
    const d = await getDrizzle();
    const rows = await d
      .select({ id: banners.id })
      .from(banners)
      .where(displayedBannerCondition(bannerClock()))
      .orderBy(...displayedBannerOrder)
      .all();
    return rows.map((r) => r.id);
  }

  it("l'horloge gelée est bien celle que partagent les deux chemins", () => {
    expect(bannerClock()).toBe(MAINTENANT);
  });

  it("aux bornes exactes, les deux verdicts désignent les mêmes bannières", async () => {
    // Une fin AU MOMENT PRÉCIS où l'on regarde : terminée (gt, pas gte).
    banniere({ id: 1, titre: "Finit maintenant", ordre: 0, fin: MAINTENANT });
    // Une seconde de plus : encore à l'écran.
    banniere({ id: 2, titre: "Finit dans 1 s", ordre: 1, fin: "2026-06-15 12:00:01" });
    // Un début AU MOMENT PRÉCIS : commencée (lte).
    banniere({ id: 3, titre: "Commence maintenant", ordre: 2, debut: MAINTENANT });
    banniere({ id: 4, titre: "Commence dans 1 s", ordre: 3, debut: "2026-06-15 12:00:01" });
    banniere({ id: 5, titre: "Sans fenêtre", ordre: 4 });
    banniere({ id: 6, titre: "Inactive, fenêtre ouverte", ordre: 5, active: 0 });

    const parListBanners = (await listBanners())
      .filter((b) => b.carousel_position !== null)
      .map((b) => b.id);

    expect(parListBanners).toEqual(await affichéesSelonLaVitrine());
    // Et la liste attendue, écrite à la main : sans elle, deux chemins
    // également faux s'accorderaient.
    expect(parListBanners).toEqual([2, 3, 5]);
  });
});
