import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

const CLASSES = [
  "nk-section", "nk-section-alt", "nk-container",
  "nk-grid", "nk-split",
  "nk-lead", "nk-card", "nk-media", "nk-specs", "nk-quote", "nk-cta",
  "nk-banner",
  "nk-faq",
];

describe("vocabulaire de contenu libre", () => {
  it("définit chaque classe du vocabulaire", () => {
    for (const c of CLASSES) {
      expect(css, `classe ${c} absente de globals.css`).toContain(`.${c}`);
    }
  });

  it("n'emploie aucune couleur littérale dans le layer du vocabulaire", () => {
    const start = css.indexOf("@layer nk-content");
    const end = css.indexOf("@layer utilities");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // Borné au layer lui-même : sans la borne haute, ce test inspecterait tout
    // ce qui suit dans le fichier et interdirait une couleur littérale là où
    // elle est légitime, tout en prétendant ne vérifier que le vocabulaire.
    const layer = css.slice(start, end);
    // Les couleurs doivent venir des tokens : var(--...), jamais d'un hex ou d'un rgb().
    expect(layer).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer).not.toMatch(/\brgba?\(/);
  });

  it("place le layer avant les utilities pour que l'auteur garde la main", () => {
    expect(css.indexOf("@layer nk-content")).toBeLessThan(css.indexOf("@layer utilities"));
  });
});
