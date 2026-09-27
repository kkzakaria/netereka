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

  // Revue de phase, point 5 : le "." de tête de ".desc-<scope>" doit être
  // échappé dans la regex, pas seulement le reste du préfixe — un "."
  // regex non échappé matche n'importe quel caractère. Non échappé, cette
  // entrée aurait produit ".m.desc-p1-actuel" (le "y" de "mydesc" absorbé
  // comme "n'importe quel caractère" par le "." de tête) : un sélecteur qui
  // ne correspond plus à rien, donc un panneau stylé par rien — le mensonge
  // inverse que cette fonction existe pour empêcher.
  it("n'échappe pas seulement le scope mais tout le préfixe, point compris", () => {
    // La vraie occurrence de ".desc-p1" est nécessaire pour dépasser le
    // filtre rapide (`css.includes(rawPrefix)`) qui court-circuite toute la
    // fonction quand le préfixe littéral n'apparaît nulle part — sans elle,
    // ce test passerait même avec le bug, puisque la regex ne tournerait
    // jamais. ".mydesc-p1", elle, ne doit JAMAIS être touchée.
    const html = "<style>.desc-p1 h1 { color: red; } .mydesc-p1 h2 { color: blue; }</style>";

    const { html: rewritten } = scopeCurrentPanel(html, SCOPE);

    expect(rewritten).toContain(".desc-p1-actuel h1");
    // Un "." non échappé matche n'importe quel caractère : le "y" de
    // "mydesc-p1" se ferait alors happer par ce "." de tête, et
    // ".mydesc-p1" ressortirait réécrit en ".m.desc-p1-actuel" — un
    // sélecteur qui ne correspond plus à rien.
    expect(rewritten).toContain(".mydesc-p1 h2");
    expect(rewritten).not.toContain(".m.desc-p1-actuel");
  });
});
