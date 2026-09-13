import { describe, it, expect } from "vitest";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

describe("checkDesignConformance", () => {
  it("ne remonte rien sur un document conforme", () => {
    const html = [
      '<section class="nk-section">',
      '  <div class="nk-container">',
      '    <p class="nk-lead">Trois jours d\'autonomie.</p>',
      '    <img class="nk-media" src="/images/x.jpg" alt="Vue de face">',
      "  </div>",
      "</section>",
    ].join("\n");
    expect(checkDesignConformance(html)).toEqual([]);
  });

  it("repère une couleur littérale et donne sa ligne", () => {
    const issues = checkDesignConformance('<p>ok</p>\n<p style="color:#ff0000">rouge</p>');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("literal-color");
    expect(issues[0].line).toBe(2);
    expect(issues[0].suggestion).toContain("var(--");
  });

  it("repère rgb() et hsl() comme couleurs littérales", () => {
    expect(checkDesignConformance('<p style="color:rgb(1,2,3)">x</p>')[0].code).toBe("literal-color");
    expect(checkDesignConformance("<style>.a{color:hsl(1,2%,3%)}</style>")[0].code).toBe("literal-color");
  });

  it("repère une taille de police en px", () => {
    const issues = checkDesignConformance('<p style="font-size:18px">x</p>');
    expect(issues[0].code).toBe("px-font-size");
    expect(issues[0].suggestion).toContain("rem");
  });

  it("repère une largeur fixe en px", () => {
    expect(checkDesignConformance("<style>.a{width:960px}</style>")[0].code).toBe("fixed-size");
  });

  it("repère position:fixed, un z-index élevé et !important", () => {
    expect(checkDesignConformance("<style>.a{position:fixed}</style>")[0].code).toBe("fixed-position");
    expect(checkDesignConformance("<style>.a{z-index:9999}</style>")[0].code).toBe("high-z-index");
    expect(checkDesignConformance("<style>.a{color:var(--primary)!important}</style>")[0].code).toBe("important");
  });

  it("ne remonte pas un z-index modeste", () => {
    expect(checkDesignConformance("<style>.a{z-index:2}</style>")).toEqual([]);
  });

  it("repère une image sans alt, y compris avec un alt vide", () => {
    expect(checkDesignConformance('<img src="/a.jpg">')[0].code).toBe("image-without-alt");
    expect(checkDesignConformance('<img src="/a.jpg" alt="">')[0].code).toBe("image-without-alt");
    expect(checkDesignConformance('<img src="/a.jpg" alt="Vue">')).toEqual([]);
  });

  it("tronque l'extrait à 80 caractères", () => {
    const long = `<p style="color:#fff">${"a".repeat(300)}</p>`;
    expect(checkDesignConformance(long)[0].excerpt.length).toBeLessThanOrEqual(80);
  });

  it("ne jette jamais et ne retourne jamais autre chose qu'un tableau", () => {
    expect(checkDesignConformance("")).toEqual([]);
    expect(checkDesignConformance("<<<>>> pas du HTML")).toBeInstanceOf(Array);
  });
});
