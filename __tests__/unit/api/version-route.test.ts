import { describe, it, expect, vi, beforeEach } from "vitest";

const { mocks } = vi.hoisted(() => ({ mocks: { getEnv: vi.fn() } }));
vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));

import { GET } from "@/app/api/version/route";

const METADONNEES = {
  id: "3cd3cc08-4762-45ea-b0c5-ffd1103cee10",
  tag: "sha-a232f5a",
  timestamp: "2026-10-04T15:22:16.769Z",
};

beforeEach(() => {
  // mockReset, pas clearAllMocks : seule la réinitialisation efface AUSSI
  // l'implémentation, et l'ordre des tests est tiré au sort.
  mocks.getEnv.mockReset();
});

describe("GET /api/version", () => {
  it("nomme la version qui a répondu", async () => {
    mocks.getEnv.mockResolvedValue({ CF_VERSION_METADATA: METADONNEES });
    const reponse = await GET();
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ id: METADONNEES.id, depuis: METADONNEES.timestamp });
  });

  // L'étiquette porte le sha git du commit déployé. Cet endpoint est public :
  // l'UUID suffit à confronter demandé et servi, le sha n'y ajoute qu'une
  // empreinte de build distribuée à tout le monde.
  it("ne distribue PAS l'étiquette git", async () => {
    mocks.getEnv.mockResolvedValue({ CF_VERSION_METADATA: METADONNEES });
    const corps = await (await GET()).text();
    expect(corps).not.toContain("sha-a232f5a");
    expect(corps).not.toContain("tag");
  });

  // Une réponse mise en cache nommerait la version d'une AUTRE requête — soit
  // exactement le mensonge que cet endpoint existe pour empêcher.
  it("interdit la mise en cache", async () => {
    mocks.getEnv.mockResolvedValue({ CF_VERSION_METADATA: METADONNEES });
    expect((await GET()).headers.get("cache-control")).toBe("no-store");
  });

  // Sans ce cas, l'absence de liaison rendrait `{ id: undefined }` en 200, que
  // le vérificateur lirait comme « surcharge non appliquée » : on chercherait
  // le problème du mauvais côté.
  it("dit 503 en NOMMANT la liaison quand elle manque", async () => {
    for (const env of [{}, { CF_VERSION_METADATA: undefined }, { CF_VERSION_METADATA: {} }]) {
      mocks.getEnv.mockResolvedValue(env);
      const reponse = await GET();
      expect(reponse.status).toBe(503);
      expect(JSON.stringify(await reponse.json())).toContain("CF_VERSION_METADATA");
    }
  });
});
