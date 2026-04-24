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
  dbInsert: vi.fn().mockReturnThis(),
  dbValues: vi.fn().mockReturnThis(),
  dbOnConflict: vi.fn().mockResolvedValue(undefined),
  getEnv: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
            mocks.dbOnConflict(c);
            return Promise.resolve();
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
    expect(result.enabled).toBe(true);
  });

  it("quand DB vide + env var présente, signale apiKeyFromEnv=true", async () => {
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.getEnv.mockResolvedValue({ ANTHROPIC_API_KEY: "sk-ant-envkey-wxyz" });

    const result = await getAiConfig();

    expect(result.apiKeyMask).toBe("••••••••wxyz");
    expect(result.apiKeyFromEnv).toBe(true);
  });

  it("quand ni DB ni env, apiKeyMask est null", async () => {
    mocks.dbGet.mockResolvedValue(undefined);
    mocks.getEnv.mockResolvedValue({});

    const result = await getAiConfig();

    expect(result.apiKeyMask).toBeNull();
    expect(result.apiKeyFromEnv).toBe(false);
  });
});

describe("saveAiConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.getEnv.mockResolvedValue({});
    mocks.dbGet.mockResolvedValue(undefined);
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
  });

  it("préserve la clé existante quand le masque est renvoyé tel quel", async () => {
    mocks.dbGet.mockResolvedValue({
      id: 1,
      anthropic_api_key: "sk-ant-existing-zzzz",
      model: null,
      enabled: 1,
    });

    const fd = new FormData();
    fd.set("anthropic_api_key", "••••••••zzzz"); // identique au masque → NE PAS écraser
    fd.set("model", "claude-opus-4-7");
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(true);
    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        anthropic_api_key: "sk-ant-existing-zzzz", // preserved, not overwritten with the mask
      }),
    );
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

  it("enabled absent du FormData → 0", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "sk-ant-k");
    // no "enabled" key

    await saveAiConfig(fd);

    expect(mocks.dbValues).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: 0 }),
    );
  });

  it("clé API trop longue → fieldErrors", async () => {
    const fd = new FormData();
    fd.set("anthropic_api_key", "x".repeat(501));
    fd.set("enabled", "on");

    const result = await saveAiConfig(fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.anthropic_api_key).toBeDefined();
  });
});
