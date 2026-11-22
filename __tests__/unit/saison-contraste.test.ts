import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Le design exige que le texte du bandeau ET les touches dorées passent AA
 * dans les deux modes. Les étoiles et le soulignement sont des éléments
 * graphiques : seuil de 3:1 (WCAG 1.4.11) ; le texte du bandeau : 4.5:1.
 * Les couleurs sont lues dans `app/globals.css` lui-même, pour que le test
 * suive toute retouche des tokens.
 */
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf-8");

function bloc(selecteur: string): string {
  const debut = css.indexOf(`${selecteur} {`);
  if (debut < 0) throw new Error(`bloc introuvable : ${selecteur}`);
  return css.slice(debut, css.indexOf("}", debut));
}

function token(source: string, nom: string): [number, number, number] {
  const m = source.match(new RegExp(`--${nom}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`));
  if (!m) throw new Error(`token introuvable : ${nom}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Luminance relative WCAG d'une couleur oklch (sRGB, gamut écrêté). */
function luminance([L, C, h]: [number, number, number]): number {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contraste(x: [number, number, number], y: [number, number, number]): number {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const clair = bloc('[data-saison="fetes"]');
const sombre = bloc('.dark [data-saison="fetes"]');
const fondClair = token(bloc(":root"), "background");
const fondSombre = token(bloc(".dark"), "background");

describe("contraste des touches festives", () => {
  it.each(["festif-or", "festif-rouge"])("mode clair : %s ≥ 3:1 sur le fond de page", (nom) => {
    expect(contraste(token(clair, nom), fondClair)).toBeGreaterThanOrEqual(3);
  });

  it.each(["festif-or", "festif-rouge"])("mode sombre : %s ≥ 3:1 sur le fond de page", (nom) => {
    expect(contraste(token(sombre, nom), fondSombre)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["clair", clair],
    ["sombre", sombre],
  ])("mode %s : texte du bandeau ≥ 4.5:1", (_mode, source) => {
    const fond = token(source, "festif-bandeau");
    expect(contraste(token(clair, "festif-bandeau-foreground"), fond)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["clair", clair],
    ["sombre", sombre],
  ])("mode %s : l'étoile dorée du bandeau ≥ 3:1", (_mode, source) => {
    expect(contraste(token(source, "festif-or"), token(source, "festif-bandeau"))).toBeGreaterThanOrEqual(3);
  });
});
