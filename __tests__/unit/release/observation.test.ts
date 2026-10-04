import { describe, it, expect } from "vitest";
import {
  EN_TETE_SURCHARGE,
  VERSIONS_PAR_DEPLOIEMENT,
  applicabilite,
  commandeDeploiementAZero,
  enTeteDeSurcharge,
  lireArguments,
  resoudreVersion,
  valeurDeSurcharge,
  verifierVersionServie,
  type PartDeVersion,
  type VersionConnue,
} from "@/lib/release/observation";

const A = "3cd3cc08-4762-45ea-b0c5-ffd1103cee10";
const B = "22acd5bd-1111-2222-3333-444455556666";
const C = "3cd3cc99-7777-8888-9999-aaaabbbbcccc";

const VERSIONS: VersionConnue[] = [
  { id: A, tag: "sha-a232f5a", creeLe: "2026-10-04T15:22:16Z", message: "aperçu de révision" },
  { id: B, tag: "sha-277435b", creeLe: "2026-10-04T14:31:07Z" },
  { id: C, tag: undefined, creeLe: "2026-10-03T09:00:00Z" },
];

describe("resoudreVersion", () => {
  it("accepte l'UUID complet, un préfixe, le sha git et l'étiquette entière", () => {
    for (const ref of [A, "3cd3cc08", "a232f5a", "sha-a232f5a"]) {
      const r = resoudreVersion(ref, VERSIONS);
      expect(r.trouve, ref).toBe(true);
      if (r.trouve) expect(r.version.id).toBe(A);
    }
  });

  it("ignore la casse et les espaces autour", () => {
    const r = resoudreVersion("  3CD3CC08  ", VERSIONS);
    expect(r.trouve && r.version.id).toBe(A);
  });

  // Le cas qui justifie à lui seul cette fonction : deux versions partagent
  // le préfixe « 3cd3cc ». Rendre la première reviendrait à tirer au sort la
  // version qu'on croit observer.
  it("REFUSE une référence ambiguë et nomme les candidates", () => {
    const r = resoudreVersion("3cd3cc", VERSIONS);
    expect(r.trouve).toBe(false);
    if (!r.trouve) {
      expect(r.raison).toContain("2 versions");
      expect(r.raison).toContain("3cd3cc08");
      expect(r.raison).toContain("3cd3cc99");
    }
  });

  it("refuse une référence trop courte avant même de chercher", () => {
    const r = resoudreVersion("3cd", VERSIONS);
    expect(r.trouve).toBe(false);
    if (!r.trouve) expect(r.raison).toContain("trop court");
  });

  it("refuse ce qui ne correspond à rien", () => {
    expect(resoudreVersion("deadbeef", VERSIONS).trouve).toBe(false);
  });

  it("ne confond pas une version sans étiquette avec une recherche par sha", () => {
    const r = resoudreVersion("sha-", VERSIONS);
    expect(r.trouve).toBe(false);
  });
});

describe("valeurDeSurcharge", () => {
  it("rend un dictionnaire RFC 8941", () => {
    expect(valeurDeSurcharge("netereka", A)).toBe(`netereka="${A}"`);
  });

  // Un préfixe passe très bien dans curl ET est ignoré par Cloudflare : la
  // requête rend 200, servie par une autre version. C'est exactement l'échec
  // silencieux que ce module existe pour rendre impossible.
  it("LÈVE sur un préfixe au lieu de fabriquer un en-tête ignoré", () => {
    expect(() => valeurDeSurcharge("netereka", "3cd3cc08")).toThrow(/UUID complet/);
  });

  it("lève sur un identifiant mal formé", () => {
    for (const mauvais of ["", "pas-un-uuid", `${A} `, `${A}"`, A.toUpperCase()]) {
      expect(() => valeurDeSurcharge("netereka", mauvais), mauvais).toThrow();
    }
  });

  it("lève sur un nom de Worker qui pourrait casser le dictionnaire", () => {
    for (const mauvais of ['nete"reka', "nete reka", "", "-netereka", "nete;reka"]) {
      expect(() => valeurDeSurcharge(mauvais, A), mauvais).toThrow();
    }
  });

  it("enTeteDeSurcharge porte le nom exact que Cloudflare lit", () => {
    expect(enTeteDeSurcharge("netereka", A)).toEqual({ [EN_TETE_SURCHARGE]: `netereka="${A}"` });
    expect(EN_TETE_SURCHARGE).toBe("Cloudflare-Workers-Version-Overrides");
  });
});

describe("applicabilite", () => {
  const canari: PartDeVersion[] = [
    { versionId: A, pourcentage: 10 },
    { versionId: B, pourcentage: 90 },
  ];

  it("rend le pourcentage servi quand la version est dans le déploiement", () => {
    expect(applicabilite(A, canari)).toEqual({ applicable: true, pourcentage: 10 });
  });

  // Une version à 0 % est le cas NORMAL de l'observation : présente pour être
  // surchargeable, invisible pour les clients.
  it("accepte une version à 0 %", () => {
    expect(applicabilite(C, [{ versionId: C, pourcentage: 0 }, { versionId: A, pourcentage: 100 }]))
      .toEqual({ applicable: true, pourcentage: 0 });
  });

  it("refuse hors déploiement et dit que la surcharge serait ignorée", () => {
    const r = applicabilite(C, canari);
    expect(r.applicable).toBe(false);
    if (!r.applicable) {
      expect(r.raison).toContain("IGNORÉE");
      expect(r.placeLibre).toBe(false); // les deux places sont prises
    }
  });

  it("signale une place libre quand le déploiement ne sert qu'une version", () => {
    const r = applicabilite(C, [{ versionId: A, pourcentage: 100 }]);
    expect(r.applicable).toBe(false);
    if (!r.applicable) expect(r.placeLibre).toBe(true);
    expect(VERSIONS_PAR_DEPLOIEMENT).toBe(2);
  });
});

describe("commandeDeploiementAZero", () => {
  it("ajoute la version à 0 % sans toucher aux parts existantes", () => {
    const cmd = commandeDeploiementAZero(C, [{ versionId: A, pourcentage: 100 }]);
    expect(cmd).toBe(`npx wrangler versions deploy ${A}@100% ${C}@0% --yes`);
  });
});

describe("verifierVersionServie", () => {
  it("conforme quand la version servie est celle demandée", () => {
    expect(verifierVersionServie(A, A)).toEqual({ conforme: true });
    expect(verifierVersionServie(A, A.toUpperCase())).toEqual({ conforme: true });
  });

  it("nomme les DEUX versions quand la surcharge n'a pas pris", () => {
    const v = verifierVersionServie(A, B);
    expect(v.conforme).toBe(false);
    if (!v.conforme) {
      expect(v.message).toContain("NON appliquée");
      expect(v.message).toContain("22acd5bd");
      expect(v.message).toContain("3cd3cc08");
    }
  });

  it("distingue « pas de version rendue » de « mauvaise version »", () => {
    const v = verifierVersionServie(A, undefined);
    expect(v.conforme).toBe(false);
    if (!v.conforme) expect(v.message).toContain("CF_VERSION_METADATA");
  });
});

describe("lireArguments", () => {
  const defauts = { chemin: "/", base: "https://netereka.ci" };
  const lire = (...args: string[]) => lireArguments(args, defauts);

  it("sans rien : aucune référence, les défauts", () => {
    expect(lire()).toEqual({ ref: undefined, chemin: "/", base: "https://netereka.ci", verifier: false });
  });

  it("lit la référence, le chemin, la base et le drapeau dans n'importe quel ordre", () => {
    expect(lire("--verifier", "--chemin", "/apercu/banniere/42", "a232f5a")).toEqual({
      ref: "a232f5a",
      chemin: "/apercu/banniere/42",
      base: "https://netereka.ci",
      verifier: true,
    });
  });

  // Deux drapeaux portant la même valeur : la valeur appartient au drapeau
  // qui la précède, jamais à la référence.
  it("ne confond pas deux valeurs de drapeau identiques avec une référence", () => {
    expect(lire("--chemin", "/", "--base", "/")).toEqual({
      ref: undefined,
      chemin: "/",
      base: "",
      verifier: false,
    });
  });

  it("retire la barre finale de la base, pour ne pas construire « //chemin »", () => {
    expect(lire("--base", "https://netereka.ci///").base).toBe("https://netereka.ci");
  });

  it("refuse un drapeau sans valeur au lieu d'avaler le suivant", () => {
    expect(() => lire("--chemin", "--verifier")).toThrow(/attend une valeur/);
    expect(() => lire("--base")).toThrow(/attend une valeur/);
  });

  it("refuse une option inconnue et deux références", () => {
    expect(() => lire("--inconnu")).toThrow(/Option inconnue/);
    expect(() => lire("a232f5a", "277435b")).toThrow(/une seule version/i);
  });
});
