import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BandeauFetes } from "@/components/storefront/saison/bandeau-fetes";
import { EtoileLogo, GuirlandeEtoiles } from "@/components/storefront/saison/decor";
import { messageBandeau } from "@/lib/saison/config";

const rendre = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const echapper = (s: string) => s.replace(/'/g, "&#x27;");

describe("BandeauFetes", () => {
  const html = rendre(createElement(BandeauFetes, { apercu: false }));

  it("affiche le message de la saison", () => {
    expect(html).toContain(echapper(messageBandeau()));
  });

  it("est une région nommée, annoncée normalement", () => {
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Message des fêtes"');
  });

  it("propose un bouton de fermeture nommé, de 44 px", () => {
    expect(html).toContain('aria-label="Fermer le message des fêtes"');
    expect(html).toMatch(/<button[^>]*class="[^"]*\bsize-11\b/);
  });

  it("centre son message, le bouton de fermeture hors du flux pour ne pas le décaler", () => {
    expect(html).toMatch(/<p[^>]*class="[^"]*\btext-center\b/);
    expect(html).toMatch(/<div[^>]*class="[^"]*\babsolute\b[^"]*"[^>]*><button[^>]*aria-label="Fermer/);
  });

  it("ne se signale comme aperçu que pour l'aperçu", () => {
    expect(html).not.toContain("Aperçu — invisible pour les clients");
    expect(rendre(createElement(BandeauFetes, { apercu: true }))).toContain(
      "Aperçu — invisible pour les clients",
    );
  });
});

describe.each([
  ["GuirlandeEtoiles", GuirlandeEtoiles],
  ["EtoileLogo", EtoileLogo],
])("%s", (_nom, Composant) => {
  const html = rendre(createElement(Composant));

  it("est masqué aux lecteurs d'écran", () => {
    expect(html).toMatch(/^<[a-z]+[^>]*aria-hidden="true"/);
  });

  it("reste léger : ni image raster, ni animation SMIL (que le mouvement réduit ne pourrait pas couper)", () => {
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<animate/);
  });

  it("scintille par la seule classe CSS prévue", () => {
    expect(html).toContain('class="festif-scintille"');
  });
});

describe("GuirlandeEtoiles — jeu de lumière", () => {
  const html = rendre(createElement(GuirlandeEtoiles));
  const delais = [...html.matchAll(/animation-delay:(-?[\d.]+)s/g)].map((m) => Number(m[1]));

  it("couvre un écran de 4K en largeur (étoiles posées une à une, pas en motif)", () => {
    const etoiles = (html.match(/class="festif-scintille"/g) ?? []).length;
    expect(etoiles * 24).toBeGreaterThanOrEqual(3840);
  });

  it("décale chaque étoile : la lumière court le long de la guirlande", () => {
    expect(delais.length).toBe((html.match(/class="festif-scintille"/g) ?? []).length);
    expect(new Set(delais).size).toBeGreaterThan(5);
  });
});

describe("CSS du scintillement", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf-8");

  it("définit l'animation sous la saison seulement", () => {
    expect(css).toMatch(/@keyframes festif-scintille\b/);
    expect(css).toMatch(/\[data-saison="fetes"\] \.festif-scintille\s*\{[^}]*animation:[^}]*festif-scintille/);
  });

  it("s'arrête pour qui demande moins de mouvement", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-saison="fetes"\] \.festif-scintille\s*\{\s*animation: none;/,
    );
  });
});
