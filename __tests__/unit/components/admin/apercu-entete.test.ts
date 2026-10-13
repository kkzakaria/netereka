import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApercuEntete } from "@/components/admin/apercu-entete";

/**
 * Le bandeau d'aperçu porte le SEUL marqueur dont `apercu_revision` exige la
 * présence par `waitForSelector`. Toute la garde contre « j'ai photographié
 * la page de connexion en croyant voir ma révision » repose sur ce seul
 * attribut.
 *
 * Ce test MONTE le composant au lieu de lire son source : une mutation qui
 * retirait l'attribut laissait verts tous les autres tests, y compris celui
 * qui vérifie que chaque page d'aperçu « porte le marqueur » — car les pages
 * se contentent de référencer `ApercuEntete`. L'émission elle-même n'était
 * prouvée nulle part.
 */
const rendu = (revisionId: string, type = "banniere") =>
  renderToStaticMarkup(createElement(ApercuEntete, { revisionId, type }));

describe("ApercuEntete", () => {
  it("émet data-apercu-revision avec l'identifiant exact", () => {
    expect(rendu("rev-42")).toContain('data-apercu-revision="rev-42"');
  });

  it("le sélecteur qu'attend l'outil correspond bien à ce qui est rendu", () => {
    // La forme exacte construite par `lib/mcp/tools/apercu.ts`.
    const selecteur = (id: string) => `[data-apercu-revision="${id}"]`;
    const html = rendu("rev-7");
    const attendu = selecteur("rev-7").replace(/^\[|\]$/g, "");
    expect(html).toContain(attendu);
    expect(html).not.toContain(selecteur("rev-8").replace(/^\[|\]$/g, ""));
  });

  // Une hauteur nulle ou un `hidden` ne satisferait pas une vérification de
  // visibilité côté navigateur : le marqueur ne serait jamais trouvé et
  // AUCUNE capture ne réussirait.
  it("reste visible : ni hidden, ni hauteur nulle, ni display none", () => {
    const html = rendu("rev-1");
    expect(html).not.toMatch(/\bhidden\b/);
    expect(html).not.toMatch(/h-0\b/);
    expect(html).not.toMatch(/display:\s*none/);
  });

  // L'image part au modèle : qu'elle soit auto-identifiante lui évite de
  // tenir ensemble une photo et un identifiant reçus séparément.
  it("dit à l'écran ce qu'on regarde, et que ce n'est pas en ligne", () => {
    const html = rendu("rev-42", "produit");
    expect(html).toContain("rev-42");
    expect(html).toContain("produit");
    // L'apostrophe part en entité HTML dans le balisage statique : on vérifie
    // le propos, pas son échappement.
    expect(html).toContain("pas en ligne");
    expect(html).toContain("Aperçu de révision");
  });
});
