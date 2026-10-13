import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * « LA PAGE VÉRIFIE TOUJOURS » — vrai aujourd'hui, et seulement parce qu'il
 * y a exactement deux fichiers sous `app/(storefront)/apercu`.
 *
 * Toute la conception du laissez-passer de capture repose là-dessus : le
 * middleware ne fait que LAISSER PASSER une requête porteuse du cookie, sans
 * vérifier sa signature, parce que la page vérifie. Si l'on ajoutait un jour
 * une troisième page d'aperçu — ou un `route.ts` — en oubliant
 * `autoriserApercu`, elle serait servie à qui présente n'importe quel cookie
 * du bon nom. Ce n'est pas une hypothèse : c'est exactement la forme du trou
 * qu'on a trouvé dans `config.matcher`, où la garde tenait par accident.
 *
 * Ce test lit l'arborescence plutôt que de faire confiance à une liste.
 */
const RACINE = path.join(process.cwd(), "app", "(storefront)", "apercu");

function fichiersDeRoute(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) return fichiersDeRoute(complet);
    return /^(page|route|layout|default)\.(ts|tsx)$/.test(entree) ? [complet] : [];
  });
}

describe("toute route d'aperçu passe par autoriserApercu", () => {
  const fichiers = fichiersDeRoute(RACINE);

  it("il y a bien des routes à garder", () => {
    expect(fichiers.length).toBeGreaterThan(0);
  });

  it.each(fichiers.map((f) => [path.relative(process.cwd(), f), f]))(
    "%s appelle autoriserApercu",
    (_nom, complet) => {
      const source = readFileSync(complet, "utf8");
      expect(source).toContain("autoriserApercu");
      // Et pas `requireAdmin` tout court : un capteur n'a pas de session, et
      // la capture ramènerait la photo de la page de connexion.
      expect(source).not.toMatch(/\brequireAdmin\s*\(/);
    },
  );

  // Le marqueur est ce qui fait échouer une capture hors de l'aperçu plutôt
  // que de rendre l'image d'une autre page. Une page d'aperçu sans marqueur
  // serait incapturable — un échec bruyant, mais mieux vaut le dire ici.
  it.each(fichiers.map((f) => [path.relative(process.cwd(), f), f]))(
    "%s porte le marqueur de capture",
    (_nom, complet) => {
      expect(readFileSync(complet, "utf8")).toMatch(/ApercuEntete|data-apercu-revision/);
    },
  );
});
