import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Les outils de bannière décrivent à l'appelant la SURFACE du hero, puisque
 * `content_html` y est une composition libre : rien ne lui impose de grille,
 * de colonne ni d'emplacement. Reste à lui dire ce que la surface, elle,
 * impose — ses dimensions, son fond, le vocabulaire disponible, ce qui n'est
 * pas inscriptible.
 *
 * Pourquoi ces tests existent : une description de rendu est une dette. La
 * version précédente de ce texte annonçait « une grille de DEUX colonnes » et
 * « n'y compose pas une mise en page pleine largeur » — exact quand il a été
 * écrit, faux depuis que la diapositive est libérée, et un assistant aurait
 * composé contre une réalité périmée sans que rien ne bronche. Ces tests
 * gardent donc le COUPLAGE entre chaque CHIFFRE ou PROMESSE de la description
 * et sa source de vérité (le composant, globals.css, la réponse de l'outil) —
 * jamais la prose.
 *
 * La promesse centrale — « rien d'autre que ton HTML n'est affiché sur la
 * diapositive », donc pas de seconde image — est prouvée en montant le
 * composant, dans __tests__/unit/components/hero-banner-canvas.test.ts.
 */

const mocks = vi.hoisted(() => ({ getBannerById: vi.fn(), listPendingRevisions: vi.fn() }));
vi.mock("@/lib/db/banners", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/banners")>()),
  getBannerById: mocks.getBannerById,
}));
vi.mock("@/lib/db/revisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/revisions")>()),
  listPendingRevisions: mocks.listPendingRevisions,
}));

import { bannerTools } from "@/lib/mcp/tools/banners";
import { updateBannerShape } from "@/lib/validations/mcp-banner";
import { BANNER_WRITABLE_COLUMN_LIST } from "@/lib/db/revisions";
import type { McpContext } from "@/lib/mcp/context";

const ROOT = resolve(process.cwd());
const HERO = readFileSync(resolve(ROOT, "components/storefront/hero-banner.tsx"), "utf8");
const CSS = readFileSync(resolve(ROOT, "app/globals.css"), "utf8");

const descriptions = bannerTools.map((t) => t.description).join("\n");
const tool = (name: string) => bannerTools.find((t) => t.name === name)!;

/** La classe de la diapositive elle-même, reconnue à son `flex-[0_0_100%]` —
 *  et non celle de l'emplacement d'image du repli, qui porte d'autres
 *  `h-[…px]` (160/280/360) dont deux chiffres se recoupent. */
const slideClass = HERO.match(/className="([^"]*flex-\[0_0_100%\][^"]*)"/)?.[1] ?? "";

describe("les trois outils qui lisent ou écrivent une bannière décrivent la surface", () => {
  for (const name of ["get_banner", "update_banner", "create_banner"]) {
    it(`${name} porte la description de la surface`, () => {
      expect(tool(name), `${name} absent`).toBeTruthy();
      expect(tool(name).description, `${name} ne décrit pas la surface`).toContain("LA SURFACE DU HERO");
    });
  }

  it("dit que la composition est libre et occupe la diapositive entière", () => {
    expect(descriptions).toMatch(/COMPOSITION LIBRE/);
    expect(descriptions).toMatch(/diapositive ENTIÈRE/);
    expect(descriptions).toMatch(/[Aa]ucune grille/);
  });

  // withdraw_banner n'écrit aucun contenu : lui coller la description de la
  // surface serait du bruit dans son contexte.
  it("ne l'inflige pas à withdraw_banner, qui n'écrit aucun contenu", () => {
    expect(tool("withdraw_banner").description).not.toContain("LA SURFACE DU HERO");
  });
});

describe("couplage : chaque chiffre de la description vient du composant", () => {
  it("la diapositive déclare bien trois hauteurs", () => {
    // Prémisse des deux tests suivants : s'ils comparaient une liste vide à
    // une description vide, ils passeraient sans rien garder.
    expect(slideClass, "classe de la diapositive introuvable dans le hero").not.toBe("");
    expect([...slideClass.matchAll(/h-\[(\d+)px\]/g)]).toHaveLength(3);
  });

  it("les hauteurs annoncées sont celles que le hero rend", () => {
    const heights = [...slideClass.matchAll(/h-\[(\d+)px\]/g)].map((m) => m[1]);
    for (const h of heights) {
      expect(descriptions, `hauteur ${h}px rendue mais absente de la description`).toContain(`${h} px`);
    }
  });

  it("n'annonce aucune hauteur que le hero ne rende pas", () => {
    const heights = new Set([...slideClass.matchAll(/h-\[(\d+)px\]/g)].map((m) => m[1]));
    // « N px de haut » : les largeurs de point de rupture (640, 1024) sont
    // dites « px de large » et ne sont donc pas ramassées ici.
    const claimed = [...descriptions.matchAll(/(\d+) px de haut/g)].map((m) => m[1]);
    expect(claimed.length, "la description ne cite aucune hauteur").toBeGreaterThan(0);
    for (const c of claimed) {
      expect([...heights], `hauteur ${c}px annoncée mais absente du hero`).toContain(c);
    }
  });

  it("l'angle du dégradé annoncé est celui que le hero applique", () => {
    const angle = HERO.match(/linear-gradient\((\d+)deg/)?.[1];
    expect(angle, "dégradé introuvable dans le hero").toBeTruthy();
    expect(descriptions).toContain(`dégradé à ${angle}°`);
  });

  it("le dégradé annoncé est bien construit depuis les deux couleurs réglables", () => {
    // La description dit « deux couleurs réglables (bg_gradient_from,
    // bg_gradient_to) » : vrai parce que la slide les interpole.
    expect(HERO).toMatch(/linear-gradient\(\d+deg,\s*\$\{slide\.bg_from\},\s*\$\{slide\.bg_to\}\)/);
    expect(descriptions).toMatch(/bg_gradient_from, bg_gradient_to/);
  });
});

describe("couplage : le vocabulaire annoncé existe vraiment", () => {
  // La description nomme des classes « déjà stylées pour cette surface ».
  // Promettre une classe que globals.css ne définit pas enverrait l'auteur
  // écrire du HTML sans style, en silence.
  //
  // Les noms sont EXTRAITS de la description, pas listés ici : une liste
  // figée ne peut pas voir la classe inventée de demain, alors que c'est
  // exactement le défaut à empêcher.
  const mentioned = [...new Set([...descriptions.matchAll(/\bnk-[a-z]+(?:-[a-z]+)*/g)].map((m) => m[0]))];

  it("la description nomme bien du vocabulaire nk-", () => {
    // Prémisse du test suivant : sans elle, une description qui ne nommerait
    // plus aucune classe le passerait en comparant deux ensembles vides.
    expect(mentioned.length, "aucune classe nk- dans la description").toBeGreaterThanOrEqual(9);
  });

  it("chaque classe nk- qu'elle nomme est une règle de globals.css", () => {
    for (const cls of mentioned) {
      expect(CSS, `${cls} annoncée mais sans règle dans globals.css`).toMatch(
        new RegExp(`^\\s*\\.${cls}\\s*\\{`, "m"),
      );
    }
  });

  // L'autre direction : ces classes-là font tout l'intérêt de la surface
  // (couleurs, carte translucide, bouton, image fluide). Les retirer de la
  // description renverrait l'auteur écrire ses propres couleurs.
  const REQUIRED = [
    "nk-banner", "nk-banner-badge", "nk-banner-title", "nk-banner-subtitle",
    "nk-banner-price", "nk-cta", "nk-media", "nk-split", "nk-grid",
  ];
  for (const cls of REQUIRED) {
    it(`${cls} reste annoncée`, () => {
      expect(mentioned, `${cls} absente de la description`).toContain(cls);
    });
  }
});

describe("image_url : clé de stockage non inscriptible, mais URL publique plaçable", () => {
  it("absent du schéma d'entrée, pour qu'aucune URL libre n'y soit posée", () => {
    expect(updateBannerShape).not.toHaveProperty("image_url");
  });

  // L'asymétrie est volontaire et vaut d'être gardée : la colonne RESTE
  // inscriptible côté révision, pour le jour où un outil d'image de bannière
  // déposera une clé R2 qu'il aura lui-même produite. C'est la porte d'entrée
  // qui est fermée, pas la colonne.
  it("mais la colonne reste inscriptible côté révision", () => {
    expect(BANNER_WRITABLE_COLUMN_LIST).toContain("image_url");
  });

  it("la description dit qu'il n'est pas modifiable et par où passer", () => {
    expect(descriptions).toMatch(/image_url n'est PAS modifiable/);
    expect(descriptions).toMatch(/\/banners/);
  });

  it("et renvoie vers image_public_url pour la placer soi-même", () => {
    expect(descriptions).toContain("image_public_url");
  });
});

describe("couplage : get_banner renvoie bien l'URL publique qu'il promet", () => {
  const ctx: McpContext = { user: { id: "a", name: "A", role: "admin" }, clientId: "c" };
  const answer = async () => {
    mocks.listPendingRevisions.mockResolvedValue([]);
    const res = await tool("get_banner").handler(ctx, { id: 7 });
    return JSON.parse((res as { content: { text: string }[] }).content[0].text);
  };

  it("résout la clé de stockage en URL utilisable dans un src", async () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "https://r2.netereka.ci");
    mocks.getBannerById.mockResolvedValue({ id: 7, image_url: "banners/7-a.jpg" });
    const { banner } = await answer();
    expect(banner.image_public_url).toBe("https://r2.netereka.ci/banners/7-a.jpg");
    // Sans retirer la clé : c'est elle que porte la ligne en base.
    expect(banner.image_url).toBe("banners/7-a.jpg");
    vi.unstubAllEnvs();
  });

  // Décision assumée, et annoncée dans la description : `NEXT_PUBLIC_R2_URL`
  // est une variable de BUILD. Si elle manque, aucune URL ne peut être
  // devinée. Renvoyer le repli `/images/<clé>` de `getImageUrl` serait pire
  // qu'un null : il ressemble à une URL valide et ne mène à rien.
  it("rend null plutôt qu'un chemin cassé quand l'adresse publique manque", async () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "");
    mocks.getBannerById.mockResolvedValue({ id: 7, image_url: "banners/7-a.jpg" });
    const { banner } = await answer();
    expect(banner.image_public_url).toBeNull();
    vi.unstubAllEnvs();
  });

  it("rend null quand la bannière n'a pas d'image", async () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "https://r2.netereka.ci");
    mocks.getBannerById.mockResolvedValue({ id: 7, image_url: null });
    const { banner } = await answer();
    expect(banner.image_public_url).toBeNull();
    vi.unstubAllEnvs();
  });

  it("la description prévient que null signifie « non adressable, compose sans »", () => {
    expect(tool("get_banner").description).toMatch(/null/);
    expect(tool("get_banner").description).toMatch(/ne devine aucune URL/);
  });
});
