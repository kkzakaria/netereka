import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  dbGet: vi.fn(),
  getEnv: vi.fn(),
}));

vi.mock("@/lib/db/drizzle", () => ({
  getDrizzle: vi.fn().mockResolvedValue({
    select: () => ({
      from: () => ({
        where: () => ({
          get: mocks.dbGet,
        }),
      }),
    }),
  }),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockImplementation(async () => ({ env: await mocks.getEnv() })),
}));

import { getAiSettings } from "@/lib/ai/config";

describe("getAiSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockResolvedValue({});
  });

  it("renvoie les valeurs DB quand la row est complète", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-db-key",
      model: "claude-opus-4-7",
      enabled: 1,
    });

    const result = await getAiSettings();

    expect(result).toEqual({
      apiKey: "sk-ant-db-key",
      model: "claude-opus-4-7",
      enabled: true,
    });
  });

  it("tombe en fallback env var quand la row DB a un apiKey null", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: null,
      model: null,
      enabled: 1,
    });
    mocks.getEnv.mockResolvedValue({
      ANTHROPIC_API_KEY: "sk-ant-env-key",
      AI_MODEL: "claude-sonnet-4-6",
    });

    const result = await getAiSettings();

    expect(result.apiKey).toBe("sk-ant-env-key");
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.enabled).toBe(true);
  });

  it("renvoie null/undefined quand ni DB ni env ne fournissent de valeur", async () => {
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.getEnv.mockResolvedValue({});

    const result = await getAiSettings();

    expect(result).toEqual({
      apiKey: null,
      model: undefined,
      enabled: true, // default-on preserved
    });
  });

  it("enabled=0 en DB override l'env var (DB est source de vérité si row existe)", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-db",
      model: null,
      enabled: 0,
    });
    mocks.getEnv.mockResolvedValue({ AI_PRODUCT_CREATION_ENABLED: "1" });

    const result = await getAiSettings();

    expect(result.enabled).toBe(false);
  });

  it('sans row DB, AI_PRODUCT_CREATION_ENABLED="0" désactive la feature', async () => {
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.getEnv.mockResolvedValue({ AI_PRODUCT_CREATION_ENABLED: "0" });

    const result = await getAiSettings();

    expect(result.enabled).toBe(false);
  });

  it("strings vides en DB tombent en fallback env", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "",
      model: "",
      enabled: 1,
    });
    mocks.getEnv.mockResolvedValue({
      ANTHROPIC_API_KEY: "sk-ant-env",
      AI_MODEL: "claude-opus-4-7",
    });

    const result = await getAiSettings();

    expect(result.apiKey).toBe("sk-ant-env");
    expect(result.model).toBe("claude-opus-4-7");
  });
});
