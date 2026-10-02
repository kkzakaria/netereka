/**
 * La vérification au démarrage du Worker.
 *
 * Trois propriétés tiennent toute sa valeur, et chacune a son test :
 *   1. elle ne tourne qu'UNE FOIS par isolat ;
 *   2. elle JOURNALISE BRUYAMMENT quand il y a dérive ;
 *   3. elle ne LÈVE JAMAIS — un garde-fou qui met la vitrine à terre est pire
 *      que la dérive qu'il signale.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  liaisonsDeLIsolat,
  reinitialiserVerificationLiaisons,
  verifierLiaisonsUneFois,
} from "@/lib/drift/au-demarrage";
import { LIAISONS_DECLAREES } from "@/lib/drift/liaisons-declarees";

/** Un env qui porte exactement ce qu'env.d.ts déclare : aucune dérive. */
function envConforme(): Record<string, unknown> {
  return Object.fromEntries(LIAISONS_DECLAREES.map((l) => [l.nom, "valeur"]));
}

let erreurs: unknown[][];

beforeEach(() => {
  reinitialiserVerificationLiaisons();
  erreurs = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    erreurs.push(args);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  reinitialiserVerificationLiaisons();
});

describe("liaisonsDeLIsolat", () => {
  it("rend les noms, triés, sans jamais rendre les valeurs", () => {
    const l = liaisonsDeLIsolat({ B: "secret-tres-sensible", A: {} });
    expect(l.map((x) => x.nom)).toEqual(["A", "B"]);
    expect(JSON.stringify(l)).not.toContain("secret-tres-sensible");
  });

  it("rend une liste vide sur une valeur qui n'est pas un objet", () => {
    expect(liaisonsDeLIsolat(null)).toEqual([]);
    expect(liaisonsDeLIsolat(undefined)).toEqual([]);
    expect(liaisonsDeLIsolat("env")).toEqual([]);
  });
});

describe("verifierLiaisonsUneFois", () => {
  it("se tait quand l'environnement est conforme", () => {
    verifierLiaisonsUneFois(envConforme());
    expect(erreurs).toEqual([]);
  });

  it("se tait aussi quand seule une liaison OPTIONNELLE manque", () => {
    const env = envConforme();
    delete env.XAI_API_KEY;
    delete env.RESEND_FROM_EMAIL;
    verifierLiaisonsUneFois(env);
    expect(erreurs).toEqual([]);
  });

  it("journalise quand une liaison REQUISE manque", () => {
    const env = envConforme();
    delete env.TURNSTILE_SECRET_KEY;
    verifierLiaisonsUneFois(env);
    expect(erreurs).toHaveLength(1);
    expect(String(erreurs[0][0])).toContain("TURNSTILE_SECRET_KEY");
    expect(String(erreurs[0][0])).toContain("ABSENT DE LA RÉALITÉ");
  });

  it("journalise une liaison présente et non déclarée — l'autre sens", () => {
    verifierLiaisonsUneFois({ ...envConforme(), OPENROUTER_API_KEY: "x" });
    expect(erreurs).toHaveLength(1);
    expect(String(erreurs[0][0])).toContain("OPENROUTER_API_KEY");
    expect(String(erreurs[0][0])).toContain("DÉCLARÉ NULLE PART");
  });

  it("rapproche les deux versants d'un renommage dans le journal", () => {
    const env = envConforme();
    delete env.BRAVE_SEARCH_API_KEY;
    env.BRAVE_API_KEY = "x";
    // Ici BRAVE_SEARCH_API_KEY est optionnelle, donc son absence est une
    // information ; mais BRAVE_API_KEY présente et non déclarée est bien une
    // erreur, et le rapprochement doit la relier à l'autre.
    verifierLiaisonsUneFois(env);
    expect(String(erreurs[0][0])).toContain("BRAVE_API_KEY");
    expect(String(erreurs[0][0])).toContain("rapprochement");
  });

  it("ne tourne qu'une fois par isolat", () => {
    const env = envConforme();
    delete env.DB;
    verifierLiaisonsUneFois(env);
    verifierLiaisonsUneFois(env);
    verifierLiaisonsUneFois(env);
    expect(erreurs).toHaveLength(1);
  });

  it("ne lève jamais, même sur un env piégé", () => {
    const piege = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("env hostile");
        },
      },
    );
    expect(() => verifierLiaisonsUneFois(piege)).not.toThrow();
    expect(String(erreurs[0][0])).toContain("impossible");
  });

  it("une levée ne se rejoue pas à la requête suivante", () => {
    const piege = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("env hostile");
        },
      },
    );
    verifierLiaisonsUneFois(piege);
    verifierLiaisonsUneFois(piege);
    expect(erreurs).toHaveLength(1);
  });

  it("refuse de comparer un env vide plutôt que de déclarer tout manquant", () => {
    verifierLiaisonsUneFois({});
    expect(erreurs).toHaveLength(1);
    expect(String(erreurs[0][0])).toContain("aucune clé lisible");
    // Et surtout : pas un mur de 14 écarts faux.
    expect(String(erreurs[0][0])).not.toContain("TURNSTILE_SECRET_KEY");
  });
});
