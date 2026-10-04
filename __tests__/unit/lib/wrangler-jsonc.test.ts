import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { nomDuWorker, sansCommentaires, varsDeclarees } from "@/lib/config/wrangler-jsonc";

const REEL = readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8");

describe("sansCommentaires", () => {
  it("retire une ligne // et un bloc /* */", () => {
    expect(JSON.parse(sansCommentaires('{ // un mot\n "a": 1 /* et un autre */ }'))).toEqual({ a: 1 });
  });

  // Le cas qui compte : wrangler.jsonc est plein d'URL. Manger le « // » de
  // « https:// » tronquerait la chaîne et ferait lever l'analyse — ou pire,
  // la laisserait passer déformée.
  it("ne touche pas à un // ni à un /* à l'intérieur d'une chaîne", () => {
    const entree = '{ "url": "https://netereka.ci/a", "glob": "a/*b" }';
    expect(JSON.parse(sansCommentaires(entree))).toEqual({
      url: "https://netereka.ci/a",
      glob: "a/*b",
    });
  });

  it("ne confond pas un guillemet échappé avec une fin de chaîne", () => {
    expect(JSON.parse(sansCommentaires('{ "a": "il dit \\" // pas un commentaire" }')).a).toContain(
      "// pas un commentaire",
    );
  });
});

describe("nomDuWorker", () => {
  it("lit le nom du vrai wrangler.jsonc du dépôt", () => {
    expect(nomDuWorker(REEL)).toBe("netereka");
  });

  // Rendre "" fabriquerait l'en-tête `="<uuid>"`, que Cloudflare ignore :
  // l'observation porterait sur une autre version, en silence.
  it("LÈVE plutôt que de rendre un nom vide ou absent", () => {
    expect(() => nomDuWorker("{}")).toThrow(/name/);
    expect(() => nomDuWorker('{ "name": "" }')).toThrow(/name/);
    expect(() => nomDuWorker('{ "name": 3 }')).toThrow(/name/);
  });
});

describe("varsDeclarees", () => {
  it("lit les vars du vrai fichier malgré les commentaires qui les entourent", () => {
    expect(varsDeclarees(REEL)).toContain("AI_IMAGE_MONTHLY_LIMIT");
  });

  it("rend une liste vide, triée, quand il n'y en a pas", () => {
    expect(varsDeclarees("{}")).toEqual([]);
    expect(varsDeclarees('{ "vars": { "B": "1", "A": "2" } }')).toEqual(["A", "B"]);
  });
});
