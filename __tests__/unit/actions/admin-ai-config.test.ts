import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  dbGet: vi.fn(),
  dbValues: vi.fn().mockReturnThis(),
  dbOnConflict: vi.fn().mockResolvedValue(undefined),
  getEnv: vi.fn().mockResolvedValue({}),
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockImplementation(async () => ({ env: await mocks.getEnv() })),
}));
vi.mock("@/lib/db/drizzle", () => ({
  getDrizzle: vi.fn().mockResolvedValue({
    select: () => ({
      from: () => ({
        where: () => ({ get: mocks.dbGet }),
      }),
    }),
    insert: () => ({
      values: (v: unknown) => {
        mocks.dbValues(v);
        return {
          onConflictDoUpdate: (c: unknown) => {
            return mocks.dbOnConflict(c);
          },
        };
      },
    }),
  }),
}));

import { getAiConfig, saveAiConfig } from "@/actions/admin/ai-config";

describe("getAiConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.getEnv.mockResolvedValue({});
    mocks.dbGet.mockReset();
  });

  it("redirige si pas admin", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(getAiConfig()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("renvoie la clé masquée (last 4) quand une row DB existe", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-longkey-abcd",
      model: "claude-opus-4-7",
      enabled: 1,
    });

    const result = await getAiConfig();

    expect(result.apiKeyMask).toBe("••••••••abcd");
    expect(result.apiKeyFromEnv).toBe(false);
    expect(result.model).toBe("claude-opus-4-7");
    expect(result.modelFromEnv).toBe(false);
    expect(result.enabled).toBe(true);
  });

  it("quand DB vide + env var présente, signale apiKeyFromEnv=true", async () => {
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.getEnv.mockResolvedValue({ ANTHROPIC_API_KEY: "sk-ant-envkey-wxyz" });

    const result = await getAiConfig();

    expect(result.apiKeyMask).toBe("••••••••wxyz");
    expect(result.apiKeyFromEnv).toBe(true);
  });

  it("quand DB sans modèle + env modèle présent, signale modelFromEnv=true", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-db",
      model: null,
      enabled: 1,
    });
    mocks.getEnv.mockResolvedValue({ AI_MODEL: "claude-sonnet-4-6" });

    const result = await getAiConfig();

    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.modelFromEnv).toBe(true);
  });

  it("quand ni DB ni env, apiKeyMask est null", async () => {
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.getEnv.mockResolvedValue({});

    const result = await getAiConfig();

    expect(result.apiKeyMask).toBeNull();
    expect(result.apiKeyFromEnv).toBe(false);
    expect(result.model).toBeNull();
    expect(result.modelFromEnv).toBe(false);
  });

  it("graceful degradation: erreur DB → fallback env, pas de throw", async () => {
    mocks.dbGet.mockRejectedValue(new Error("D1_ERROR: no such table: ai_config"));
    mocks.getEnv.mockResolvedValue({ ANTHROPIC_API_KEY: "sk-ant-env-1234" });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getAiConfig();

    expect(result.apiKeyMask).toBe("••••••••1234");
    expect(result.apiKeyFromEnv).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe("saveAiConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.getEnv.mockResolvedValue({});
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.dbOnConflict.mockResolvedValue(undefined);
  });

  it("redirige si pas admin", async () => {
    mocks.getSession.mockResolvedValue(null);
    const fd = new FormData();
    await expect(saveAiConfig(fd)).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("sauvegarde une nouvelle clé", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-newkey-1234");
    fd.set("model", "claude-opus-4-7");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result).toEqual({ success: true });
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        anthropic_api_key: "sk-ant-newkey-1234",
        model: "claude-opus-4-7",
        enabled: 1,
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/ai-settings");
  });

  it("sauvegarde la clé Brave en plus de la clé Anthropic", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-x-1234");
    fd.set("brave_api_key", "BSA-realbravekey");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        anthropic_api_key: "sk-ant-x-1234",
        brave_api_key: "BSA-realbravekey",
      }),
    );
  });

  it("préserve la clé Brave existante quand son masque est renvoyé tel quel", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-existing-zzzz",
      brave_api_key: "BSA-existing-9876",
      model: null,
      enabled: 1,
    });

    const fd = new FormData();
    fd.set("anthropic_api_key", "••••••••zzzz");
    fd.set("brave_api_key", "••••••••9876");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        anthropic_api_key: "sk-ant-existing-zzzz",
        brave_api_key: "BSA-existing-9876",
      }),
    );
  });

  it("met à jour Brave seul, préserve Anthropic via masque", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-existing-aaaa",
      brave_api_key: null,
      model: null,
      enabled: 1,
    });

    const fd = new FormData();
    fd.set("anthropic_api_key", "••••••••aaaa");
    fd.set("brave_api_key", "BSA-fresh-key");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        anthropic_api_key: "sk-ant-existing-aaaa",
        brave_api_key: "BSA-fresh-key",
      }),
    );
  });

  it("clé Brave vide → null (n'active pas image_search)", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-x-1234");
    fd.set("brave_api_key", "");
    fd.set("enabled", "on");

    await saveAiConfig(fd);

    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({ brave_api_key: null }),
    );
  });

  it("préserve la clé existante quand le masque est renvoyé tel quel", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-existing-zzzz",
      model: null,
      enabled: 1,
    });

    const fd = new FormData();
    fd.set("anthropic_api_key", "••••••••zzzz");
    fd.set("model", "claude-opus-4-7");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        anthropic_api_key: "sk-ant-existing-zzzz",
      }),
    );
  });

  it("rejette une valeur masque-shape quand aucune clé existante en DB", async () => {
    mocks.dbGet.mockResolvedValue(undefined);

    const fd = new FormData();
    fd.set("anthropic_api_key", "••••••••1234");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.anthropic_api_key).toBeDefined();
    expect(mocks.dbValues).not.toHaveBeenCalled();
  });

  it("rejette le masque env (DB sans clé) soumis tel quel", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: null,
      model: null,
      enabled: 1,
    });

    const fd = new FormData();
    fd.set("anthropic_api_key", "••••••••wxyz");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.anthropic_api_key).toBeDefined();
  });

  it("transforme model vide → null", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-k");
    fd.set("model", "");
    fd.set("enabled", "on");

    await saveAiConfig(fd);

    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({ model: null }),
    );
  });

  it("clé vide → null (efface la clé existante)", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-existing-key",
      model: null,
      enabled: 1,
    });

    const fd = new FormData();
    fd.set("anthropic_api_key", "");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({ anthropic_api_key: null }),
    );
  });

  it("enabled absent du FormData → 0", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-k");

    await saveAiConfig(fd);

    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: 0 }),
    );
  });

  it("clé API trop longue → fieldErrors", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-" + "x".repeat(500));
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.anthropic_api_key).toBeDefined();
    expect(mocks.dbValues).not.toHaveBeenCalled();
    expect(mocks.dbOnConflict).not.toHaveBeenCalled();
  });

  it("modèle trop long → fieldErrors", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-k");
    fd.set("model", "x".repeat(101));
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.model).toBeDefined();
    expect(mocks.dbValues).not.toHaveBeenCalled();
    expect(mocks.dbOnConflict).not.toHaveBeenCalled();
  });

  it("erreur DB sur upsert → ActionResult error, pas de throw", async () => {
    mocks.dbOnConflict.mockRejectedValue(new Error("D1_ERROR"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-k");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("clé qui ne commence pas par sk-ant- → fieldErrors", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "wrong-prefix-key");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.anthropic_api_key).toBeDefined();
    expect(mocks.dbValues).not.toHaveBeenCalled();
    expect(mocks.dbOnConflict).not.toHaveBeenCalled();
  });

  it("clé valide sk-ant-... acceptée", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-real-1234");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
  });
});
