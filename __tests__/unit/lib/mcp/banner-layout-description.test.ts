import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bannerTools } from "@/lib/mcp/tools/banners";
import { updateBannerShape } from "@/lib/validations/mcp-banner";
import { BANNER_WRITABLE_COLUMN_LIST } from "@/lib/db/revisions";

/**
 * Un assistant en service s'est arrêté net le 2026-10-02 : « ne sachant pas où
 * l'image s'affiche par rapport au texte, je n'en ai pas ajouté une seconde
 * dans le HTML ». Il avait raison de s'abstenir — aucune description ne le lui
 * disait.
 *
 * Décrire une mise en page dans un texte crée une dette : le jour où le rendu
 * change, la description ment, et un assistant compose contre une réalité
 * périmée sans que rien ne bronche. Ces tests gardent donc le COUPLAGE entre ce
 * que la description affirme et ce que le composant fait — pas la prose.
 */

const HERO = resolve(process.cwd(), "components/storefront/hero-banner.tsx");
const descriptions = bannerTools.map((t) => t.description).join("\n");

describe("la description des outils de bannière décrit le rendu réel", () => {
  it("les trois outils qui écrivent ou lisent une bannière portent la mise en page", () => {
    for (const name of ["get_banner", "update_banner", "create_banner"]) {
      const tool = bannerTools.find((t) => t.name === name);
      expect(tool, `${name} absent`).toBeTruthy();
      expect(tool!.description, `${name} ne décrit pas la mise en page`).toMatch(/DEUX colonnes/);
    }
  });

  // LE test de ce fichier : si quelqu'un passe le hero sur une seule colonne,
  // la description devient fausse et c'est ici que ça doit se voir.
  it("le hero rend bien deux colonnes, comme la description l'affirme", () => {
    expect(readFileSync(HERO, "utf-8")).toContain("grid-cols-2");
  });

  // La description dit que les deux colonnes existent même sans image : c'est
  // vrai parce que `grid-cols-2` est inconditionnel, et seul le CONTENU de la
  // colonne droite est conditionné par image_url.
  it("les deux colonnes ne dépendent pas de la présence d'une image", () => {
    const src = readFileSync(HERO, "utf-8");
    const grid = src.indexOf("grid-cols-2");
    const conditional = src.indexOf("slide.image_url &&");
    expect(grid).toBeGreaterThan(-1);
    expect(conditional).toBeGreaterThan(grid); // la condition est À L'INTÉRIEUR de la grille
  });

  it("l'image se pose à DROITE : sa colonne suit celle du contenu dans le DOM", () => {
    const src = readFileSync(HERO, "utf-8");
    expect(src.indexOf("slide.content_html ?")).toBeLessThan(src.indexOf("slide.image_url &&"));
  });
});

describe("image_url : non modifiable par le MCP, et la description le dit", () => {
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
});
