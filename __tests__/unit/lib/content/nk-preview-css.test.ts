import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NK_PREVIEW_CSS } from "@/lib/content/nk-preview-css";

const css = readFileSync(path.resolve(__dirname, "../../../../app/globals.css"), "utf8");

/** Extrait un bloc CSS équilibré (accolades comptées) à partir de l'index où
 *  commence son sélecteur/at-rule — pas seulement jusqu'à la première "}",
 *  qui couperait un bloc contenant un @media imbriqué. */
function extractBalanced(source: string, startIndex: number): string {
  const braceIndex = source.indexOf("{", startIndex);
  let depth = 0;
  let i = braceIndex;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return source.slice(startIndex, i);
}

describe("aperçu HTML — vocabulaire nk- injecté dans l'iframe (item 6)", () => {
  // Ce test est le garde-fou contre la dérive documenté en tête de
  // lib/content/nk-preview-css.ts : NK_PREVIEW_CSS est une copie figée de
  // trois blocs d'app/globals.css, et non un import de ce fichier (le
  // document srcDoc sandboxé de l'aperçu ne peut pas exécuter la pipeline
  // Tailwind du site). Si l'un de ces trois blocs change dans globals.css
  // sans que la copie soit mise à jour, ce test échoue.

  it("embarque le bloc de tokens :root (thème clair) verbatim", () => {
    const rootBlock = extractBalanced(css, css.indexOf(":root {"));
    expect(NK_PREVIEW_CSS).toContain(rootBlock);
  });

  it("embarque le bloc de tokens --hero-* verbatim", () => {
    const heroMarker = "@layer base {\n  :root {";
    const heroStart = css.indexOf(heroMarker);
    expect(heroStart).toBeGreaterThan(-1);
    const heroBlock = extractBalanced(css, heroStart);
    expect(NK_PREVIEW_CSS).toContain(heroBlock);
  });

  it("embarque le bloc @layer components (vocabulaire nk-) verbatim", () => {
    const compStart = css.indexOf("@layer components {");
    expect(compStart).toBeGreaterThan(-1);
    const compBlock = extractBalanced(css, compStart);
    expect(NK_PREVIEW_CSS).toContain(compBlock);
  });
});
