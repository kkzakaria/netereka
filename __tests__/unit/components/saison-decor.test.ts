import { describe, it, expect } from "vitest";
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

  it("reste statique et léger : ni image raster, ni animation", () => {
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/animate/);
  });
});
