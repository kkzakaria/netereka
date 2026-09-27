import { describe, it, expect } from "vitest";
import { scopeCurrentPanel } from "@/components/admin/revision-diff";

const SCOPE = "p1";

describe("scopeCurrentPanel", () => {
  it("réécrit le préfixe du <style> ET la classe du conteneur, ensemble", () => {
    const html = "<style>.desc-p1 h1 { color: red; } .desc-p1 p { margin: 0; }</style><h1>Titre</h1>";

    const { html: rewritten, scopeClass } = scopeCurrentPanel(html, SCOPE);

    expect(scopeClass).toBe("desc-p1-actuel");
    expect(rewritten).toContain(".desc-p1-actuel h1");
    expect(rewritten).toContain(".desc-p1-actuel p");
    // Aucune occurrence de l'ancien préfixe ne doit survivre en tant que
    // sélecteur : sinon la CSS scopée s'appliquerait à la fois au panneau
    // « Actuel » (via la nouvelle classe) et resterait susceptible de
    // matcher un ancêtre portant encore l'ancienne — ce que ce renommage
    // existe justement pour empêcher.
    expect(rewritten).not.toContain(".desc-p1 h1");
    expect(rewritten).not.toContain(".desc-p1 p");
    // Le corps HTML, hors <style>, est inchangé.
    expect(rewritten).toContain("<h1>Titre</h1>");
  });

  it("ne confond pas .desc-p1 avec un préfixe plus long comme .desc-p1x", () => {
    const html = "<style>.desc-p1x h1 { color: blue; } .desc-p1 h1 { color: red; }</style>";

    const { html: rewritten } = scopeCurrentPanel(html, SCOPE);

    // .desc-p1x n'est pas la portée p1 : il doit rester intact.
    expect(rewritten).toContain(".desc-p1x h1");
    expect(rewritten).toContain(".desc-p1-actuel h1");
  });

  it("laisse un HTML sans <style> inchangé à l'octet près", () => {
    const plain = "<p>Juste du texte, sans feuille de style.</p>";

    const { html, scopeClass } = scopeCurrentPanel(plain, SCOPE);

    expect(html).toBe(plain);
    expect(scopeClass).toBe("desc-p1-actuel");
  });

  it("laisse une chaîne vide inchangée", () => {
    const { html } = scopeCurrentPanel("", SCOPE);
    expect(html).toBe("");
  });
});
