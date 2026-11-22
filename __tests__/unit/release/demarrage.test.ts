import { describe, it, expect } from "vitest";
import { SONDES, UUID_FICTIF, apercu, juger, rapport, sansReponse, type Sonde } from "@/lib/release/demarrage";

const sonde = (chemin: string): Sonde => {
  const s = SONDES.find((x) => x.chemin === chemin);
  if (!s) throw new Error(`sonde absente : ${chemin}`);
  return s;
};

const VERSION = `/api/version?attendu=${UUID_FICTIF}`;
const HTML = "<!DOCTYPE html><html lang=\"fr\"><body>NETEREKA</body></html>";

describe("SONDES — les routes témoins", () => {
  it("commence par /api/version : si elle échoue, rien de l'application n'a tourné", () => {
    expect(SONDES[0].chemin).toBe(VERSION);
  });

  it("couvre la vitrine, les deux connexions, la route MCP et la découverte OAuth", () => {
    expect(SONDES.map((s) => `${s.methode} ${s.chemin}`)).toEqual([
      `GET ${VERSION}`,
      "GET /",
      "GET /auth/sign-in",
      "GET /admin/login",
      "POST /api/mcp",
      "GET /.well-known/oauth-authorization-server/api/auth",
    ]);
  });

  it("demande un UUID BIEN FORMÉ à /api/version, sinon la route répond 400 sans rien lire", () => {
    expect(UUID_FICTIF).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("juger — une réponse saine, et seulement elle", () => {
  it("rejette la signature exacte de l'incident du 2026-11-22 (500, erreur 1101)", () => {
    const v = juger(sonde(VERSION), { statut: 500, corps: "error code: 1101" });
    expect(v.ok).toBe(false);
    expect(v.motif).toContain("statut 500 au lieu de 200");
    expect(v.motif).toContain("error code: 1101");
  });

  it("accepte /api/version quand elle rend son JSON, conforme ou non", () => {
    expect(juger(sonde(VERSION), { statut: 200, corps: '{"conforme":false}' }).ok).toBe(true);
    expect(juger(sonde(VERSION), { statut: 200, corps: '{"conforme":true}' }).ok).toBe(true);
  });

  it("ne se contente pas d'un 200 : il faut le JSON de NOTRE route", () => {
    expect(juger(sonde(VERSION), { statut: 200, corps: HTML }).ok).toBe(false);
    expect(juger(sonde(VERSION), { statut: 200, corps: '{"ok":true}' }).motif).toContain("`conforme`");
    expect(juger(sonde(VERSION), { statut: 200, corps: '{"conforme":"oui"}' }).ok).toBe(false);
  });

  it("exige une page HTML sur les routes rendues", () => {
    expect(juger(sonde("/"), { statut: 200, corps: HTML }).ok).toBe(true);
    expect(juger(sonde("/"), { statut: 200, corps: "" }).motif).toContain("pas une page HTML");
  });

  it("exige le 401 de /api/mcp : un 200 sans jeton serait une porte ouverte, un 500 un échec", () => {
    expect(juger(sonde("/api/mcp"), { statut: 401, corps: "{}" }).ok).toBe(true);
    expect(juger(sonde("/api/mcp"), { statut: 200, corps: "{}" }).ok).toBe(false);
    expect(juger(sonde("/api/mcp"), { statut: 500, corps: "SCHEMA_MISMATCH" }).ok).toBe(false);
  });

  it("exige un `issuer` dans la découverte OAuth", () => {
    const s = sonde("/.well-known/oauth-authorization-server/api/auth");
    expect(juger(s, { statut: 200, corps: '{"issuer":"http://127.0.0.1:8787/api/auth"}' }).ok).toBe(true);
    expect(juger(s, { statut: 200, corps: "{}" }).ok).toBe(false);
  });
});

describe("rapport", () => {
  const bon = juger(sonde("/"), { statut: 200, corps: HTML });
  const mauvais = juger(sonde("/"), { statut: 500, corps: "boom" });

  it("est vert seulement si toutes les sondes le sont", () => {
    expect(rapport([bon, bon]).ok).toBe(true);
    expect(rapport([bon, mauvais]).ok).toBe(false);
  });

  it("n'est jamais vert sans aucune sonde : ne rien vérifier n'est pas réussir", () => {
    expect(rapport([]).ok).toBe(false);
  });

  it("donne le motif de chaque échec, et une sonde sans réponse en est un", () => {
    const { lignes } = rapport([sansReponse(sonde("/"), new Error("ECONNREFUSED"))]);
    expect(lignes[0]).toContain("✗ GET /");
    expect(lignes[0]).toContain("aucune réponse : ECONNREFUSED");
  });
});

describe("apercu", () => {
  it("resserre les espaces et tronque à 200 caractères", () => {
    expect(apercu("a\n\n  b")).toBe("a b");
    expect(apercu("x".repeat(250))).toBe(`${"x".repeat(200)}…`);
    expect(apercu("  ")).toBe("(vide)");
  });
});
