import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpContext } from "@/lib/mcp/context";

const mediaMocks = vi.hoisted(() => ({ searchImages: vi.fn() }));
vi.mock("@/lib/media/image-search", () => ({ searchImages: mediaMocks.searchImages }));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => { throw new Error("no DB in this test"); },
}));

import { imageTools } from "@/lib/mcp/tools/images";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
const tool = (name: string) => imageTools.find((t) => t.name === name)!;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("search_product_images", () => {
  it("transmet query et count à searchImages et renvoie les résultats normalisés", async () => {
    mediaMocks.searchImages.mockResolvedValue({
      ok: true,
      results: [
        { url: "https://samsung.com/a55.jpg", source_domain: "samsung.com", title: "Galaxy A55", thumbnail_url: null },
      ],
    });

    const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55", count: 5 });

    expect(mediaMocks.searchImages).toHaveBeenCalledWith({ query: "Galaxy A55", count: 5 });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.count).toBe(1);
    expect(out.results[0].url).toBe("https://samsung.com/a55.jpg");
    expect(out.results[0].source_domain).toBe("samsung.com");
    // Un résultat non vide ne porte pas de message « aucune image » :
    expect(out.message).toBeUndefined();
  });

  it("une liste vide reste un SUCCÈS et dit « aucune image trouvée »", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: true, results: [] });

    const r = await tool("search_product_images").handler(ctx, { query: "produit introuvable" });

    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.count).toBe(0);
    expect(out.message).toMatch(/Aucune image trouvée/);
  });

  // Le cœur de cet outil : un échec typé ne se replie JAMAIS sur une liste
  // vide. Sans ça, une clé absente enverrait le modèle chercher ailleurs et
  // personne ne saurait qu'une clé manque.
  it("no_api_key est une ERREUR qui nomme le secret, pas une liste vide", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "no_api_key" });

    const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55" });

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.code).toBe("internal_error");
    expect(out.message).toContain("BRAVE_SEARCH_API_KEY");
    expect(out).not.toHaveProperty("results");
  });

  it("auth_failed nomme aussi le secret (clé expirée ou révoquée)", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "auth_failed" });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out.code).toBe("internal_error");
    expect(out.message).toContain("BRAVE_SEARCH_API_KEY");
  });

  it("rate_limited devient limit_exceeded, pas internal_error", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "rate_limited" });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out.code).toBe("limit_exceeded");
  });

  it("invalid_input devient validation_error, pas internal_error", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "invalid_input" });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out.code).toBe("validation_error");
  });

  // Chaque raison garde son identité : deux raisons distinctes ne doivent pas
  // produire le même message, sinon l'exploitant ne sait pas quoi faire.
  it("les huit raisons d'échec produisent huit messages distincts", async () => {
    const reasons = [
      "no_api_key", "invalid_input", "auth_failed", "rate_limited",
      "upstream_error", "parse_failed", "timeout", "fetch_failed",
    ] as const;
    const messages = new Set<string>();
    for (const reason of reasons) {
      mediaMocks.searchImages.mockResolvedValue({ ok: false, reason });
      const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55" });
      expect(r.isError).toBe(true);
      messages.add(parse(r).message);
    }
    expect(messages.size).toBe(reasons.length);
  });

  it("ne télécharge rien : aucune image n'est attachée, seules des URL sont rendues", async () => {
    mediaMocks.searchImages.mockResolvedValue({
      ok: true,
      results: [{ url: "https://x/a.jpg", source_domain: "x", title: "t", thumbnail_url: null }],
    });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out).not.toHaveProperty("image_id");
    expect(out).not.toHaveProperty("applied");
    expect(out).not.toHaveProperty("revision");
  });

  it("une exception inattendue de searchImages ne laisse pas fuir de trace de pile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mediaMocks.searchImages.mockRejectedValue(new Error("boom at lib/media/image-search.ts:98"));

    const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55" });

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.code).toBe("internal_error");
    expect(out.message).not.toContain("boom");
    expect(out.message).not.toContain("image-search.ts");
  });
});
