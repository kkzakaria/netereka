/**
 * Le moteur lui-même : chaque catégorie d'écart, dans les deux sens, et
 * surtout ce sur quoi il doit RESTER SILENCIEUX. Un garde-fou n'a de valeur
 * que si on le croit.
 */

import { describe, it, expect } from "vitest";
import { comparerBase } from "@/lib/drift/comparer-base";
import { comparerLiaisons } from "@/lib/drift/comparer-liaisons";
import { bilan, formaterBilan, formaterSection } from "@/lib/drift/rapport";
import { distanceEdition, jetons, proximiteNoms, rapprocherEcarts } from "@/lib/drift/noms-proches";
import type { Ecart, FormeBase, FormeTable } from "@/lib/drift/types";

function table(partiel: Partial<FormeTable> & { nom: string }): FormeTable {
  return {
    colonnes: [],
    clePrimaire: [],
    index: [],
    unicites: [],
    clesEtrangeres: [],
    checksNommes: [],
    checksAnonymes: 0,
    ...partiel,
  };
}

const base = (...tables: FormeTable[]): FormeBase => ({ tables });

describe("comparerBase — tables", () => {
  it("signale une table déclarée et absente", () => {
    const e = comparerBase(base(table({ nom: "produits" })), base());
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ categorie: "table", sens: "declare_absent", gravite: "erreur", cible: "produits" });
  });

  it("signale une table présente et non déclarée", () => {
    const e = comparerBase(base(), base(table({ nom: "oauthApplication" })));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ sens: "present_non_declare", gravite: "erreur", cible: "oauthApplication" });
  });
});

describe("comparerBase — colonnes et nullabilité", () => {
  const avec = (colonnes: { nom: string; nonNul: boolean }[]) => base(table({ nom: "t", colonnes }));

  it("signale une colonne déclarée et absente", () => {
    const e = comparerBase(avec([{ nom: "a", nonNul: false }]), avec([]));
    expect(e.map((x) => [x.categorie, x.sens, x.cible])).toEqual([["colonne", "declare_absent", "t.a"]]);
  });

  it("signale une colonne présente et non déclarée", () => {
    const e = comparerBase(avec([]), avec([{ nom: "brave_api_key", nonNul: false }]));
    expect(e.map((x) => [x.sens, x.cible])).toEqual([["present_non_declare", "t.brave_api_key"]]);
  });

  it("signale un NOT NULL déclaré que la base n'a pas", () => {
    const e = comparerBase(avec([{ nom: "a", nonNul: true }]), avec([{ nom: "a", nonNul: false }]));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ categorie: "nullabilite", sens: "divergent" });
    expect(e[0].message).toContain("des null atteindront le code");
  });

  it("signale un NOT NULL en base que le code ignore", () => {
    const e = comparerBase(avec([{ nom: "a", nonNul: false }]), avec([{ nom: "a", nonNul: true }]));
    expect(e[0].message).toContain("rejetée en production");
  });

  it("ne dit rien quand les colonnes concordent", () => {
    expect(comparerBase(avec([{ nom: "a", nonNul: true }]), avec([{ nom: "a", nonNul: true }]))).toEqual([]);
  });
});

describe("comparerBase — clé primaire", () => {
  it("signale une divergence de clé primaire", () => {
    const d = base(table({ nom: "t", clePrimaire: ["id"] }));
    const r = base(table({ nom: "t", clePrimaire: ["id", "tenant"] }));
    const e = comparerBase(d, r);
    expect(e).toHaveLength(1);
    expect(e[0].categorie).toBe("cle_primaire");
    expect(e[0].message).toContain("en base (id, tenant)");
  });

  it("l'ordre des colonnes de la clé primaire compte", () => {
    const d = base(table({ nom: "t", clePrimaire: ["a", "b"] }));
    const r = base(table({ nom: "t", clePrimaire: ["b", "a"] }));
    expect(comparerBase(d, r)).toHaveLength(1);
  });
});

describe("comparerBase — index", () => {
  const idx = (nom: string, colonnes: string[] | null, unique = false) => ({ nom, colonnes, unique });

  it("signale un index présent en base et non déclaré (le cas idx_audit_log_target)", () => {
    const e = comparerBase(base(table({ nom: "t" })), base(table({ nom: "t", index: [idx("idx_t_cible", ["a", "b"])] })));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ categorie: "index", sens: "present_non_declare" });
    expect(e[0].message).toContain("perdrait sans rien dire");
  });

  it("signale un index déclaré et absent", () => {
    const e = comparerBase(base(table({ nom: "t", index: [idx("i", ["a"])] })), base(table({ nom: "t" })));
    expect(e[0].sens).toBe("declare_absent");
  });

  it("signale des colonnes d'index divergentes", () => {
    const e = comparerBase(
      base(table({ nom: "t", index: [idx("i", ["a"])] })),
      base(table({ nom: "t", index: [idx("i", ["b"])] })),
    );
    expect(e).toHaveLength(1);
    expect(e[0].sens).toBe("divergent");
  });

  it("se tait sur les colonnes quand l'un des deux côtés n'a pas su les lire", () => {
    const e = comparerBase(
      base(table({ nom: "t", index: [idx("i", null)] })),
      base(table({ nom: "t", index: [idx("i", ["a"])] })),
    );
    expect(e).toEqual([]);
  });

  it("signale une divergence d'unicité", () => {
    const e = comparerBase(
      base(table({ nom: "t", index: [idx("i", ["a"], true)] })),
      base(table({ nom: "t", index: [idx("i", ["a"], false)] })),
    );
    expect(e[0].message).toContain("déclaré UNIQUE, non unique en base");
  });
});

describe("comparerBase — contraintes UNIQUE de colonne", () => {
  it("signale une contrainte UNIQUE en base que le code ignore", () => {
    const e = comparerBase(
      base(table({ nom: "t" })),
      base(table({ nom: "t", unicites: [["email"]] })),
    );
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ categorie: "contrainte_unique", sens: "present_non_declare", cible: "t(email)" });
  });

  it("signale une contrainte UNIQUE déclarée et absente", () => {
    const e = comparerBase(
      base(table({ nom: "t", unicites: [["email"]] })),
      base(table({ nom: "t" })),
    );
    expect(e[0].message).toContain("Les doublons que le code croit impossibles sont possibles");
  });
});

describe("comparerBase — contraintes CHECK", () => {
  it("signale un CHECK déclaré et absent quand la base n'a aucun CHECK anonyme", () => {
    const e = comparerBase(
      base(table({ nom: "t", checksNommes: ["rating_range"] })),
      base(table({ nom: "t" })),
    );
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ categorie: "contrainte_check", sens: "declare_absent", gravite: "erreur" });
  });

  it("dégrade en avertissement quand la base porte un CHECK anonyme (cas reviews.rating_range)", () => {
    const e = comparerBase(
      base(table({ nom: "reviews", checksNommes: ["rating_range"] })),
      base(table({ nom: "reviews", checksAnonymes: 1 })),
    );
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ gravite: "avertissement", sens: "divergent" });
    expect(e[0].message).toContain("sans nom");
  });

  it("signale un CHECK nommé en base que le code ne déclare pas", () => {
    const e = comparerBase(base(table({ nom: "t" })), base(table({ nom: "t", checksNommes: ["x"] })));
    expect(e[0]).toMatchObject({ sens: "present_non_declare", gravite: "erreur", cible: "t.x" });
  });
});

describe("comparerLiaisons", () => {
  it("une optionnelle absente est une information, pas un écart — c'est tout le poids du « ? »", () => {
    const e = comparerLiaisons([{ nom: "XAI_API_KEY", requise: false }], []);
    expect(e).toHaveLength(1);
    expect(e[0].gravite).toBe("information");
    expect(bilan(e).derive).toBe(false);
  });

  it("la même liaison déclarée requise devient une erreur", () => {
    const e = comparerLiaisons([{ nom: "XAI_API_KEY", requise: true }], []);
    expect(e[0].gravite).toBe("erreur");
    expect(bilan(e).derive).toBe(true);
  });

  it("ne révèle jamais la valeur d'une liaison, seulement son nom, son type et sa source", () => {
    const e = comparerLiaisons([], [{ nom: "S", type: "secret_text", source: "version déployée" }]);
    expect(e[0].message).toContain("secret_text");
    expect(e[0].message).toContain("version déployée");
  });

  it("signalerNonDeclarees=false coupe le sens « surplus » et rien d'autre", () => {
    const d = [{ nom: "A", requise: true }];
    const r = [{ nom: "B", type: "plain_text", source: "s" }];
    expect(comparerLiaisons(d, r).map((x) => x.cible).sort()).toEqual(["A", "B"]);
    expect(comparerLiaisons(d, r, { signalerNonDeclarees: false }).map((x) => x.cible)).toEqual(["A"]);
  });
});

describe("rapprochement de noms", () => {
  it("découpe les noms en jetons", () => {
    expect(jetons("BRAVE_SEARCH_API_KEY")).toEqual(["BRAVE", "SEARCH", "API", "KEY"]);
  });

  it("calcule la distance d'édition", () => {
    expect(distanceEdition("SECRET", "SECERT")).toBe(2);
    expect(distanceEdition("abc", "abc")).toBe(0);
    expect(distanceEdition("", "abc")).toBe(3);
  });

  it("rapproche par inclusion de jetons", () => {
    expect(proximiteNoms("BRAVE_API_KEY", "BRAVE_SEARCH_API_KEY").proches).toBe(true);
  });

  it("NE rapproche PAS deux noms qui ne partagent que des jetons banals", () => {
    // Sans ce garde-fou le rapport mentirait en désignant un coupable au hasard.
    expect(proximiteNoms("GOOGLE_CLIENT_ID", "FACEBOOK_APP_ID").proches).toBe(false);
    expect(proximiteNoms("API_KEY", "SECRET_KEY").proches).toBe(false);
  });

  it("ne rapproche jamais des écarts de domaines ou de catégories différents", () => {
    const ecarts: Ecart[] = [
      { domaine: "liaisons", categorie: "liaison", sens: "declare_absent", gravite: "erreur", cible: "BRAVE_API_KEY", message: "" },
      { domaine: "base", categorie: "colonne", sens: "present_non_declare", gravite: "erreur", cible: "BRAVE_SEARCH_API_KEY", message: "" },
    ];
    expect(rapprocherEcarts(ecarts).every((e) => e.rapprochement === undefined)).toBe(true);
  });

  it("n'altère pas les écarts reçus", () => {
    const ecarts: Ecart[] = [
      { domaine: "liaisons", categorie: "liaison", sens: "declare_absent", gravite: "erreur", cible: "BRAVE_API_KEY", message: "" },
      { domaine: "liaisons", categorie: "liaison", sens: "present_non_declare", gravite: "erreur", cible: "BRAVE_SEARCH_API_KEY", message: "" },
    ];
    const sortie = rapprocherEcarts(ecarts);
    expect(sortie[0].rapprochement).toBeDefined();
    expect(ecarts[0].rapprochement).toBeUndefined();
  });
});

describe("rapport", () => {
  it("dit explicitement qu'il n'y a rien, plutôt que de ne rien dire", () => {
    const texte = formaterSection([], { titre: "T" });
    expect(texte).toContain("Aucun écart");
  });

  it("imprime le surplus avant le manque — l'incident A d'abord", () => {
    const ecarts: Ecart[] = [
      { domaine: "base", categorie: "table", sens: "declare_absent", gravite: "erreur", cible: "M", message: "m" },
      { domaine: "base", categorie: "table", sens: "present_non_declare", gravite: "erreur", cible: "S", message: "s" },
    ];
    const texte = formaterSection(ecarts, { titre: "T" });
    expect(texte.indexOf("PRÉSENT DANS LA RÉALITÉ")).toBeLessThan(texte.indexOf("ABSENT DE LA RÉALITÉ"));
  });

  it("regroupe sous une seule explication les écarts de même cause", () => {
    const ecarts: Ecart[] = ["a", "b", "c"].map((n) => ({
      domaine: "base" as const,
      categorie: "nullabilite" as const,
      sens: "divergent" as const,
      gravite: "avertissement" as const,
      cible: `${n}.id`,
      message: `m${n}`,
      motif: "pk_sans_not_null",
      motifLibelle: "clé primaire TEXT sans NOT NULL",
      motifExplication: "Héritage SQLite.",
    }));
    const texte = formaterSection(ecarts, { titre: "T" });
    expect(texte).toContain("3 écarts de même cause — clé primaire TEXT sans NOT NULL");
    expect(texte).toContain("Concerne : a.id, b.id, c.id");
    // Une seule occurrence de l'explication, pas trois.
    expect(texte.split("Héritage SQLite.").length - 1).toBe(1);
  });

  it("n'invente pas un groupe pour un motif isolé", () => {
    const texte = formaterSection(
      [
        {
          domaine: "base",
          categorie: "nullabilite",
          sens: "divergent",
          gravite: "avertissement",
          cible: "a.id",
          message: "message complet",
          motif: "seul",
          motifLibelle: "cause unique",
        },
      ],
      { titre: "T" },
    );
    expect(texte).not.toContain("écarts de même cause");
    expect(texte).toContain("message complet");
  });

  it("le regroupement ne change pas le bilan : chaque écart compte toujours pour un", () => {
    const ecarts: Ecart[] = ["a", "b", "c"].map((n) => ({
      domaine: "base" as const,
      categorie: "nullabilite" as const,
      sens: "divergent" as const,
      gravite: "erreur" as const,
      cible: `${n}.id`,
      message: "m",
      motif: "commun",
    }));
    expect(bilan(ecarts).erreurs).toBe(3);
  });

  it("les informations ne comptent pas comme dérive", () => {
    const b = bilan([
      { domaine: "liaisons", categorie: "liaison", sens: "declare_absent", gravite: "information", cible: "X", message: "" },
    ]);
    expect(b).toMatchObject({ erreurs: 0, avertissements: 0, informations: 1, derive: false });
    expect(formaterBilan(b)).toContain("1 information(s)");
  });

  /**
   * Un avertissement nomme un écart réel que personne n'a décidé de payer
   * maintenant — dix-huit clés primaires `TEXT` nullables qu'on ne
   * corrigerait qu'en reconstruisant dix-huit tables. Les compter comme un
   * échec rendait le travail nocturne rouge POUR TOUJOURS : mesuré en
   * production le 2026-10-04, zéro erreur, dix-neuf avertissements, et le
   * contrôle sortait quand même en 1.
   *
   * Un garde-fou rouge en permanence n'alerte plus personne. Les
   * avertissements restent imprimés ; ils cessent seulement de crier.
   */
  it("un avertissement NE fait PAS échouer : il serait rouge pour toujours", () => {
    const b = bilan([
      { domaine: "base", categorie: "contrainte_check", sens: "divergent", gravite: "avertissement", cible: "t.c", message: "" },
    ]);
    expect(b).toMatchObject({ erreurs: 0, avertissements: 1, derive: false });
    // Mais il est COMPTÉ et dit : taire un écart n'est pas l'objectif.
    expect(formaterBilan(b)).toContain("1 avertissement(s)");
  });

  it("une erreur, elle, fait échouer", () => {
    expect(
      bilan([
        { domaine: "liaisons", categorie: "liaison", sens: "present_non_declare", gravite: "erreur", cible: "X", message: "" },
      ]).derive,
    ).toBe(true);
  });
});

/**
 * Le surplus de CHECK nommés face aux anonymes de la base.
 *
 * Le test d'excuse était une PRÉSENCE (`checksAnonymes > 0`), pas un compte :
 * deux CHECK nommés déclarés face à UN anonyme en base donnaient deux
 * avertissements, alors que l'un des deux désigne une contrainte réellement
 * absente. Tant que les avertissements faisaient échouer, le défaut restait
 * visible ; depuis qu'ils n'échouent plus, il serait passé au vert — une
 * erreur rendue silencieuse par le correctif censé rendre le garde-fou
 * utilisable.
 */
describe("CHECK : on n'excuse que autant de nommés que la base a d'anonymes", () => {
  const table = (checksNommes: string[], checksAnonymes: number) => ({
    nom: "reviews",
    colonnes: [],
    clePrimaire: [],
    index: [],
    unicites: [],
    clesEtrangeres: [],
    checksNommes,
    checksAnonymes,
  });

  it("deux nommés, un seul anonyme : un avertissement ET une erreur", () => {
    const ecarts = comparerBase(
      { tables: [table(["a", "b"], 0)] },
      { tables: [table([], 1)] },
    ).filter((e) => e.categorie === "contrainte_check");

    expect(ecarts.map((e) => e.gravite).sort()).toEqual(["avertissement", "erreur"]);
    // Et le message de l'erreur DIT pourquoi : l'anonyme est déjà pris.
    expect(ecarts.find((e) => e.gravite === "erreur")?.message).toMatch(/déjà attribué/);
  });

  it("autant d'anonymes que de nommés : que des avertissements", () => {
    const ecarts = comparerBase(
      { tables: [table(["a", "b"], 0)] },
      { tables: [table([], 2)] },
    ).filter((e) => e.categorie === "contrainte_check");
    expect(ecarts.every((e) => e.gravite === "avertissement")).toBe(true);
  });

  it("aucun anonyme : que des erreurs, et le message le dit autrement", () => {
    const ecarts = comparerBase(
      { tables: [table(["a"], 0)] },
      { tables: [table([], 0)] },
    ).filter((e) => e.categorie === "contrainte_check");
    expect(ecarts[0].gravite).toBe("erreur");
    expect(ecarts[0].message).toMatch(/aucune contrainte anonyme/);
  });
});
