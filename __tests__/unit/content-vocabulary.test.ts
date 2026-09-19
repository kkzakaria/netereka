import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

const CLASSES = [
  "nk-section", "nk-section-alt", "nk-container",
  "nk-grid", "nk-split",
  "nk-lead", "nk-card", "nk-media", "nk-specs", "nk-quote", "nk-cta",
  "nk-banner", "nk-highlight-icon",
  "nk-faq", "nk-prose",
];

describe("vocabulaire de contenu libre", () => {
  it("définit chaque classe du vocabulaire", () => {
    for (const c of CLASSES) {
      expect(css, `classe ${c} absente de globals.css`).toContain(`.${c}`);
    }
  });

  it("couvre h1 à h6 dans le plancher typographique .nk-prose", () => {
    // h1 a été omis à l'origine : le preflight de Tailwind pose
    // `font-size: inherit; font-weight: inherit` sur h1..h6, et un <h1> sans
    // règle de plancher retombe donc au texte courant (cas réel : la fiche
    // "garmin-fenix-8-pro-amoled-sapphire-titane-51-mm", dont le <h1> nu
    // n'affichait plus aucun titre). Itérer les six balises plutôt que de
    // n'en lister que quelques-unes est le seul moyen que ce test empêche la
    // prochaine balise oubliée de passer inaperçue.
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
      expect(css, `:where(.nk-prose) ${tag} absent du plancher`).toMatch(
        new RegExp(`:where\\(\\.nk-prose\\)\\s*${tag}\\b`)
      );
    }
  });

  it("rejoint le layer components de Tailwind plutôt que d'ouvrir un layer nk- à part", () => {
    // La cascade CSS ordonne les layers NOMMÉS par leur PREMIÈRE apparition
    // dans le document — jamais par leur position textuelle plus bas dans le
    // fichier. `@import "tailwindcss"`, en tête de ce fichier, résout vers
    // node_modules/tailwindcss/index.css, dont la toute première ligne déclare
    // `@layer theme, base, components, utilities;` : cette instruction fixe
    // l'ordre des quatre noms AVANT que ce fichier ne déclare quoi que ce soit.
    // Un layer qui n'y figure pas — `nk-content`, tel qu'il existait avant
    // cette correction — est ajouté ensuite, donc en DERNIER, et l'emporte
    // alors sur `utilities` : l'inverse de ce que ce vocabulaire doit faire.
    //
    // Comparer des décalages de caractères DANS ce fichier — ce que cette
    // suite faisait avant — ne peut pas détecter cette différence : le texte
    // place bien `nk-content` avant `utilities`, alors même que la cascade
    // réelle fait l'inverse. Il faut vérifier le nom du layer réellement
    // utilisé, et que la prémisse tenue sur le paquet Tailwind tient toujours.
    const tailwindIndexPath = path.resolve(__dirname, "../../node_modules/tailwindcss/index.css");
    const tailwindIndex = readFileSync(tailwindIndexPath, "utf8");
    expect(tailwindIndex).toMatch(/^@layer\s+theme,\s*base,\s*components,\s*utilities;/);

    expect(css).toContain('@import "tailwindcss"');
    expect(css).not.toMatch(/@layer\s+nk-content\b/);

    const vocabAnchor = css.indexOf(".nk-section {");
    expect(vocabAnchor).toBeGreaterThan(-1);
    const layerOpen = css.lastIndexOf("@layer components {", vocabAnchor);
    expect(layerOpen).toBeGreaterThan(-1);
    expect(layerOpen).toBeLessThan(vocabAnchor);
  });

  it("n'emploie aucune couleur littérale dans le bloc du vocabulaire", () => {
    const start = css.indexOf("@layer components {");
    // Recherché à partir de `start`, pas depuis le début du fichier : le
    // commentaire qui précède ce bloc mentionne lui-même "@layer utilities"
    // en toutes lettres (pour expliquer l'ordre de la cascade), et un indexOf
    // non borné trouverait cette occurrence-là au lieu du vrai bloc utilities
    // plus bas dans le fichier.
    const end = css.indexOf("@layer utilities", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // Borné à la fin du bloc components : sans cette borne haute, ce test
    // inspecterait tout ce qui suit dans le fichier et interdirait une couleur
    // littérale là où elle est légitime, tout en prétendant ne vérifier que le
    // vocabulaire.
    const layer = css.slice(start, end);
    // Les couleurs doivent venir des tokens : var(--...), jamais d'un hex ou
    // d'un rgb(). La carte de bannière (.nk-banner-*) s'en tient volontairement
    // à des couleurs nommées CSS ("white") via color-mix() plutôt qu'à un
    // token — voir le commentaire sur .nk-banner dans globals.css — mais ce
    // n'est pas une couleur littérale au sens où ce test l'entend (un hex ou
    // un rgb() figé), donc les deux assertions tiennent sans exemption.
    expect(layer).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer).not.toMatch(/\brgba?\(/);
  });
});
