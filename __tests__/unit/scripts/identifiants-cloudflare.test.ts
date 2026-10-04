import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  analyserConfigWrangler,
  cheminsCandidats,
  compteDepuisWhoami,
  estExpire,
  porteesManquantes,
} from "../../../scripts/lib/identifiants-cloudflare";

const TOML = `
oauth_token = "ABC.def-123"
expiration_time = "2026-10-04T20:34:03.278Z"
refresh_token = "REFRESH"
scopes = [ "account:read", "workers_scripts:write", "zone:read" ]
`;

describe("analyserConfigWrangler", () => {
  it("lit le jeton, la date d'expiration et les portées", () => {
    const c = analyserConfigWrangler(TOML);
    expect(c?.jeton).toBe("ABC.def-123");
    expect(c?.expireLe?.toISOString()).toBe("2026-10-04T20:34:03.278Z");
    expect(c?.portees).toEqual(["account:read", "workers_scripts:write", "zone:read"]);
  });

  it("lit un tableau de portées écrit sur plusieurs lignes", () => {
    const c = analyserConfigWrangler('oauth_token = "x"\nscopes = [\n  "a",\n  "b",\n]\n');
    expect(c?.portees).toEqual(["a", "b"]);
  });

  // Une machine authentifiée par jeton d'API n'a pas d'`oauth_token`. C'est un
  // état normal, pas une erreur : on rend null, l'appelant décide.
  it("rend null quand il n'y a pas de jeton OAuth", () => {
    expect(analyserConfigWrangler('scopes = [ "a" ]')).toBeNull();
    expect(analyserConfigWrangler("")).toBeNull();
    expect(analyserConfigWrangler('oauth_token = ""')).toBeNull();
  });

  it("supporte l'absence d'expiration et de portées sans lever", () => {
    const c = analyserConfigWrangler('oauth_token = "x"');
    expect(c).toEqual({ jeton: "x", expireLe: null, portees: [] });
  });

  it("ne confond pas une date illisible avec une date valide", () => {
    expect(analyserConfigWrangler('oauth_token = "x"\nexpiration_time = "jamais"')?.expireLe)
      .toBeNull();
  });
});

describe("estExpire", () => {
  const t = (s: string) => new Date(s);

  it("expiré quand la date est passée", () => {
    expect(estExpire(t("2026-10-04T16:38:36Z"), t("2026-10-04T19:33:00Z"))).toBe(true);
  });

  it("valide quand il reste plus que la marge", () => {
    expect(estExpire(t("2026-10-04T20:34:00Z"), t("2026-10-04T19:34:00Z"))).toBe(false);
  });

  // Sans marge, un jeton valide au contrôle et périmé à l'appel rend une
  // erreur d'authentification sans rapport apparent avec l'expiration.
  it("considère expiré ce qui meurt dans la marge", () => {
    expect(estExpire(t("2026-10-04T19:34:30Z"), t("2026-10-04T19:34:00Z"))).toBe(true);
  });

  it("sans date d'expiration, ne déclare pas expiré", () => {
    expect(estExpire(null, t("2026-10-04T19:34:00Z"))).toBe(false);
  });
});

describe("porteesManquantes", () => {
  const portees = ["account:read", "workers_scripts:write", "zone:read"];

  it("rien à signaler quand tout est là", () => {
    expect(porteesManquantes(portees, ["workers_scripts:write"])).toEqual([]);
  });

  // Le cas réel : aucune portée OAuth de wrangler ne couvre les règles de zone.
  it("nomme ce qui manque", () => {
    expect(porteesManquantes(portees, ["rulesets:write", "zone:read"])).toEqual(["rulesets:write"]);
  });
});

describe("cheminsCandidats", () => {
  const accueil = path.join("/home", "u");

  it("cherche d'abord WRANGLER_HOME, puis XDG, puis les emplacements par défaut", () => {
    const chemins = cheminsCandidats({ WRANGLER_HOME: "/w", XDG_CONFIG_HOME: "/x" }, accueil);
    expect(chemins[0]).toBe(path.join("/w", "config", "default.toml"));
    expect(chemins[1]).toBe(path.join("/x", ".wrangler", "config", "default.toml"));
  });

  // Coder en dur ~/.config marcherait sur une machine et nulle part ailleurs.
  it("couvre Linux, macOS et l'emplacement historique", () => {
    const chemins = cheminsCandidats({}, accueil);
    expect(chemins).toContain(path.join(accueil, ".config", ".wrangler", "config", "default.toml"));
    expect(chemins).toContain(
      path.join(accueil, "Library", "Preferences", ".wrangler", "config", "default.toml"),
    );
    expect(chemins).toContain(path.join(accueil, ".wrangler", "config", "default.toml"));
  });

  it("ne rend pas deux fois le même chemin", () => {
    const chemins = cheminsCandidats({ XDG_CONFIG_HOME: path.join(accueil, ".config") }, accueil);
    expect(new Set(chemins).size).toBe(chemins.length);
  });
});

describe("compteDepuisWhoami", () => {
  const sortie = `
│ Account Name                   │ Account ID                       │
│ Koffiz2110@gmail.com's Account │ 85501c2d4beeee74b3bb42fece78e71d │
`;

  it("extrait l'identifiant du tableau", () => {
    expect(compteDepuisWhoami(sortie)).toBe("85501c2d4beeee74b3bb42fece78e71d");
  });

  // Appliquer un réglage au mauvais compte Cloudflare est le genre d'erreur
  // qu'on ne voit qu'après. On refuse au lieu de prendre le premier.
  it("REFUSE quand plusieurs comptes sont listés", () => {
    expect(() => compteDepuisWhoami(`${sortie}│ Autre │ ffffffffffffffffffffffffffffffff │`))
      .toThrow(/CLOUDFLARE_ACCOUNT_ID/);
  });

  it("refuse quand il n'y en a aucun", () => {
    expect(() => compteDepuisWhoami("Not logged in.")).toThrow(/Aucun identifiant/);
  });

  it("ne se laisse pas tromper par une chaîne hexadécimale trop courte ou trop longue", () => {
    expect(() => compteDepuisWhoami("deadbeef et 855 01c2d4beeee74b3bb42fece78e71d")).toThrow();
  });
});
