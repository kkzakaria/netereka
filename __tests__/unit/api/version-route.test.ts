import { describe, it, expect, vi, beforeEach } from "vitest";

const { mocks } = vi.hoisted(() => ({ mocks: { getEnv: vi.fn() } }));
vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));

import { GET } from "@/app/api/version/route";

const SERVIE = "3cd3cc08-4762-45ea-b0c5-ffd1103cee10";
const AUTRE = "22acd5bd-b8b2-49bb-975a-d711b3958786";
const METADONNEES = { id: SERVIE, tag: "sha-a232f5a", timestamp: "2026-10-04T15:22:16.769Z" };

const demander = (requete: string) => GET(new Request(`https://netereka.ci${requete}`));

beforeEach(() => {
  // mockReset, pas clearAllMocks : seule la réinitialisation efface AUSSI
  // l'implémentation, et l'ordre des tests est tiré au sort.
  mocks.getEnv.mockReset();
  mocks.getEnv.mockResolvedValue({ CF_VERSION_METADATA: METADONNEES });
});

describe("GET /api/version", () => {
  it("confirme quand la version servie est celle attendue", async () => {
    const reponse = await demander(`/api/version?attendu=${SERVIE}`);
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ conforme: true });
  });

  it("infirme quand une autre version a répondu", async () => {
    expect(await (await demander(`/api/version?attendu=${AUTRE}`)).json()).toEqual({
      conforme: false,
    });
  });

  // Les identifiants sont en minuscules partout, en-tête compris : accepter
  // une majuscule ici laisserait croire valide une saisie que Cloudflare
  // refuserait dans l'en-tête.
  it("refuse une majuscule, comme l'en-tête de surcharge", async () => {
    expect((await demander(`/api/version?attendu=${SERVIE.toUpperCase()}`)).status).toBe(400);
  });

  // L'identifiant de version EST le sésame de l'en-tête de surcharge.
  // Le publier ferait passer l'épinglage de « il faut un accès au compte »
  // à « n'importe qui peut le lire ».
  it("ne publie JAMAIS l'identifiant servi, ni l'étiquette git", async () => {
    for (const requete of [
      `/api/version?attendu=${SERVIE}`,
      `/api/version?attendu=${AUTRE}`,
      "/api/version",
    ]) {
      const corps = await (await demander(requete)).text();
      expect(corps, requete).not.toContain(SERVIE);
      expect(corps, requete).not.toContain("sha-a232f5a");
    }
  });

  // Un préfixe est accepté par curl et ignoré par Cloudflare dans l'en-tête :
  // le rejeter ici évite d'imputer au canari une faute de saisie.
  it("exige un UUID complet et bien formé", async () => {
    for (const mauvais of ["", "?attendu=", "?attendu=3cd3cc08", "?attendu=pas-un-uuid"]) {
      const reponse = await demander(`/api/version${mauvais}`);
      expect(reponse.status, mauvais).toBe(400);
      expect(JSON.stringify(await reponse.json())).toContain("attendu");
    }
  });

  // Une réponse mise en cache répondrait pour une AUTRE requête — soit
  // exactement le mensonge que cet endpoint existe pour empêcher.
  it("interdit la mise en cache, y compris sur les refus", async () => {
    for (const requete of [`/api/version?attendu=${SERVIE}`, "/api/version"]) {
      expect((await demander(requete)).headers.get("cache-control"), requete).toBe("no-store");
    }
  });

  it("dit 503 en NOMMANT la liaison quand elle manque", async () => {
    for (const env of [{}, { CF_VERSION_METADATA: undefined }, { CF_VERSION_METADATA: {} }]) {
      mocks.getEnv.mockResolvedValue(env);
      const reponse = await demander(`/api/version?attendu=${SERVIE}`);
      expect(reponse.status).toBe(503);
      expect(JSON.stringify(await reponse.json())).toContain("CF_VERSION_METADATA");
    }
  });
});
