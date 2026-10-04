import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * QUELLE image le préchargement désigne, décidé contre un vrai SQLite au schéma
 * des migrations — pas contre un `findFirst` simulé.
 *
 * Le test voisin de `admin-banners.test.ts` simule `findFirst`, donc il
 * n'éprouve jamais la clause `where`. C'est précisément là que vivait l'un des
 * deux défauts : la requête filtrait sur `isNotNull(image_url)` et prenait donc
 * la première bannière AVEC une image, pas la première AFFICHÉE. Seule une
 * vraie requête sur de vraies lignes peut le montrer.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown, kv: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => holder.binding,
  getKV: async () => holder.kv,
}));

import { refreshHeroPreload } from "@/lib/cloudflare/hero-preload";
import { KV_HERO_PRELOAD_KEY } from "@/lib/cloudflare/hero-preload-key";

let db: DatabaseSync;
let puts: [string, string][];
let deletes: string[];

function banniere(opts: {
  id: number; ordre: number; titre: string;
  image_url?: string | null; content_html?: string | null; is_active?: number;
}) {
  db.prepare(
    `INSERT INTO banners (id, title, link_url, display_order, is_active, image_url, content_html)
     VALUES (?, ?, '/x', ?, ?, ?, ?)`,
  ).run(opts.id, opts.titre, opts.ordre, opts.is_active ?? 1, opts.image_url ?? null, opts.content_html ?? null);
}

/** La valeur d'en-tête `Link:` écrite en KV, ou null si la clé a été supprimée. */
function prechargement(): string | null {
  return puts.length ? puts[puts.length - 1][1] : null;
}

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  puts = []; deletes = [];
  holder.kv = {
    put: async (k: string, v: string) => { puts.push([k, v]); },
    delete: async (k: string) => { deletes.push(k); },
  };
});

describe("le préchargement suit la composition", () => {
  it("précharge l'image que le content_html désigne, sans la transformer", async () => {
    banniere({
      id: 1, ordre: 0, titre: "Libre",
      image_url: "banners/ancienne.webp",
      content_html: '<div class="nk-banner"><img class="nk-media" src="https://r2.example/banners/composee.webp" alt="x"></div>',
    });

    await refreshHeroPreload();

    const v = prechargement();
    expect(v).toContain("https://r2.example/banners/composee.webp");
    // Et surtout PAS l'URL dérivée de la colonne : c'est tout le défaut.
    expect(v).not.toContain("/cdn-cgi/image/");
    expect(v).not.toContain("ancienne.webp");
    expect(v).toContain("rel=preload");
    expect(v).toContain("fetchpriority=high");
  });

  // Le gabarit de repli, lui, rend toujours l'image par React dans une colonne
  // de 44vw : `width=640` y garde son sens.
  it("sans image dans le HTML, retombe sur la colonne et sa transformation", async () => {
    banniere({ id: 1, ordre: 0, titre: "Repli", image_url: "banners/colonne.webp", content_html: null });

    await refreshHeroPreload();

    const v = prechargement();
    expect(v).toContain("/cdn-cgi/image/width=640,quality=75,format=auto/");
    expect(v).toContain("colonne.webp");
  });

  it("un content_html sans image et pas de colonne : rien à précharger", async () => {
    banniere({ id: 1, ordre: 0, titre: "Texte seul", image_url: null, content_html: "<p>Du texte</p>" });

    await refreshHeroPreload();

    expect(puts).toHaveLength(0);
    expect(deletes).toEqual(["hero:lcp:preload-url"]);
  });

  it("un content_html sans image mais une colonne : la colonne sert", async () => {
    banniere({ id: 1, ordre: 0, titre: "Mixte", image_url: "banners/c.webp", content_html: "<p>Du texte</p>" });

    await refreshHeroPreload();

    expect(prechargement()).toContain("c.webp");
  });
});

describe("le préchargement décrit la PREMIÈRE diapositive", () => {
  /**
   * Le second défaut, et celui qu'aucun test ne gardait. La requête filtrait
   * sur `isNotNull(image_url)` : avec une tête de carrousel sans image, elle
   * sautait à la suivante et préchargeait une image que le visiteur ne voit
   * pas d'abord — des octets dépensés pour rien, et le vrai LCP non préchargé.
   */
  it("ne saute pas à la diapositive suivante quand la première n'a pas d'image", async () => {
    banniere({ id: 1, ordre: 0, titre: "Première, sans image", image_url: null, content_html: "<p>Texte</p>" });
    banniere({ id: 2, ordre: 1, titre: "Seconde, avec image", image_url: "banners/seconde.webp" });

    await refreshHeroPreload();

    expect(puts).toHaveLength(0);
    expect(deletes).toEqual(["hero:lcp:preload-url"]);
  });

  it("et quand la première en a une, c'est bien la sienne", async () => {
    banniere({ id: 1, ordre: 0, titre: "Première", image_url: "banners/premiere.webp" });
    banniere({ id: 2, ordre: 1, titre: "Seconde", image_url: "banners/seconde.webp" });

    await refreshHeroPreload();

    const v = prechargement();
    expect(v).toContain("premiere.webp");
    expect(v).not.toContain("seconde.webp");
  });

  it("une bannière inactive ne compte pas, même en tête d'ordre", async () => {
    banniere({ id: 1, ordre: 0, titre: "Inactive", image_url: "banners/inactive.webp", is_active: 0 });
    banniere({ id: 2, ordre: 1, titre: "Active", image_url: "banners/active.webp" });

    await refreshHeroPreload();

    expect(prechargement()).toContain("active.webp");
  });
});

/**
 * `href` finit dans un en-tête HTTP `Link`, et il vient d'un HTML d'auteur.
 * Une espace ou un chevron y feraient lever `Headers.set` dans le
 * middleware : préchargement perdu ET erreur journalée en production, pour
 * une valeur qu'on pouvait refuser ici une fois pour toutes.
 */
describe("une URL impropre à un en-tête n'est pas stockée", () => {
  it("refuse une URL contenant une espace, et efface l'entrée", async () => {
    banniere({ id: 1, ordre: 0, titre: "A", content_html: '<img src="https://x.test/une image.png">' });
    await refreshHeroPreload();
    expect(prechargement()).toBeNull();
    expect(deletes).toContain(KV_HERO_PRELOAD_KEY);
  });

  it("accepte l'URL transformée que nous tendons aux auteurs", async () => {
    const src = "/cdn-cgi/image/width=1280,quality=80,format=auto/https://r2.netereka.ci/banners/7.png";
    banniere({ id: 1, ordre: 0, titre: "A", content_html: `<img src="${src}">` });
    await refreshHeroPreload();
    expect(prechargement()).toBe(`<${src}>; rel=preload; as=image; fetchpriority=high`);
  });
});
