import { describe, it, expect } from "vitest";
import { buildSrcDoc } from "@/components/admin/html-editor";

/**
 * buildSrcDoc est une fonction pure (aucun hook, aucun DOM) — importable et
 * testable en environnement node, malgré le "use client" du fichier qui la
 * contient (React n'est jamais rendu ici, voir CLAUDE.md).
 */
describe("buildSrcDoc", () => {
  it("injecte le vocabulaire nk- et les tokens :root dans le <head> (item 6)", () => {
    const doc = buildSrcDoc("<a class=\"nk-cta\">Voir</a>");
    // Un extrait de chaque bloc copié dans lib/content/nk-preview-css.ts —
    // le test de dérive (nk-preview-css.test.ts) garantit que la copie
    // elle-même reste fidèle à app/globals.css ; celui-ci garantit qu'elle
    // atterrit bien dans le document servi à l'iframe.
    expect(doc).toContain("--primary:");
    expect(doc).toContain(".nk-cta {");
    expect(doc).toContain(".nk-faq details");
  });

  it("place le vocabulaire nk- avant le <style> de l'auteur, qui reste plus spécifique", () => {
    const authored = '<style>.desc-x1 h1 { color: blue; }</style><h1>Titre</h1>';
    const doc = buildSrcDoc(authored);
    const vocabIndex = doc.indexOf(".nk-cta {");
    const authorIndex = doc.indexOf(".desc-x1 h1");
    expect(vocabIndex).toBeGreaterThan(-1);
    expect(authorIndex).toBeGreaterThan(-1);
    expect(vocabIndex).toBeLessThan(authorIndex);
  });

  it("garde le sandbox sans dépendance réseau : sandbox=\"\" reste géré par le composant, pas par srcDoc", () => {
    // Non-régression légère : buildSrcDoc ne doit produire qu'un document
    // autonome, sans référence à une ressource externe.
    const doc = buildSrcDoc("<p>Texte</p>");
    expect(doc).not.toMatch(/https?:\/\//);
  });
});
