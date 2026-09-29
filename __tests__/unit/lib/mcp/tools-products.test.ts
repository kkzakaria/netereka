import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpContext } from "@/lib/mcp/context";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(), updateDraft: vi.fn(), getProduct: vi.fn(), getProductDraftState: vi.fn(),
  searchProducts: vi.fn(), deleteDraft: vi.fn(),
  addImagesFromUrls: vi.fn(), removeImage: vi.fn(), setColorVariants: vi.fn(),
}));
const revisionMocks = vi.hoisted(() => ({ createRevision: vi.fn() }));

vi.mock("@/lib/db/product-drafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/product-drafts")>("@/lib/db/product-drafts");
  return { ...actual, ...mocks };
});
// `createRevision` mocké ; `RevisionError` gardée réelle pour l'instanceof de toolError.
vi.mock("@/lib/db/revisions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/revisions")>("@/lib/db/revisions");
  return { ...actual, createRevision: revisionMocks.createRevision };
});
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB in this test"); } }));

import { DraftError } from "@/lib/db/product-drafts";
import { RevisionError } from "@/lib/db/revisions";
import { productTools, writePath } from "@/lib/mcp/tools/products";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
// productTools is typed ToolDefinition[] (base shape), so handler accepts any object literal here.
const tool = (name: string) => productTools.find((t) => t.name === name)!;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);
/** What every write must hand to product-drafts, which commits it with the mutation. */
const auditFor = (tool: string) => ({ actor: { id: "admin-1", name: "Admin" }, details: { via: "mcp", tool, client_id: "client-1" } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("writePath", () => {
  it("un brouillon s'écrit directement", () => {
    expect(writePath(true)).toBe("direct");
  });

  it("une fiche publiée part en révision", () => {
    expect(writePath(false)).toBe("revision");
  });
});

describe("productTools", () => {
  it("expose exactement les outils du contrat", () => {
    expect(productTools.map((t) => t.name).sort()).toEqual([
      "add_product_images", "create_product_draft", "delete_product_draft", "get_product", "get_product_draft",
      "remove_product_image", "search_products", "set_product_variants", "update_product", "update_product_draft",
    ]);
  });

  it("create_product_draft renvoie id, slug, edit_url et passe l'attribution d'audit à l'écriture", async () => {
    mocks.createDraft.mockResolvedValue({ id: "p1", slug: "galaxy-a55" });
    const r = await tool("create_product_draft").handler(ctx, { name: "Galaxy A55", category_id: "cat-1" });
    expect(r.isError).toBeUndefined();
    expect(parse(r)).toEqual({ id: "p1", slug: "galaxy-a55", edit_url: "/products/p1/edit" });
    expect(mocks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Galaxy A55", category_id: "cat-1" }),
      auditFor("create_product_draft"),
    );
  });

  it("un échec de l'écriture (audit compris, même batch) devient internal_error sans audit hors transaction", async () => {
    mocks.createDraft.mockRejectedValue(new Error("audit_log insert failed"));
    const r = await tool("create_product_draft").handler(ctx, { name: "Galaxy A55", category_id: "cat-1" });
    expect(r.isError).toBe(true);
    expect(parse(r)).toEqual({ code: "internal_error", message: expect.any(String) });
    expect(parse(r).message).not.toContain("audit_log");
  });

  describe("get_product", () => {
    it("relit une fiche et rapporte is_draft, brouillon comme publiée", async () => {
      mocks.getProduct.mockResolvedValue({ id: "p1", is_draft: false });
      const r = await tool("get_product").handler(ctx, { id: "p1" });
      expect(r.isError).toBeUndefined();
      expect(parse(r)).toEqual({ id: "p1", is_draft: false });
      expect(mocks.getProduct).toHaveBeenCalledWith("p1");
    });

    it("mappe une erreur inattendue vers internal_error sans détail", async () => {
      mocks.getProduct.mockRejectedValue(new Error("D1 exploded with secret details"));
      const r = await tool("get_product").handler(ctx, { id: "p1" });
      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("internal_error");
      expect(parse(r).message).not.toContain("secret");
    });
  });

  describe("get_product_draft (alias déprécié)", () => {
    it("délègue exactement au même comportement que get_product", async () => {
      mocks.getProduct.mockResolvedValue({ id: "p1", is_draft: true });
      const r = await tool("get_product_draft").handler(ctx, { id: "p1" });
      expect(parse(r)).toEqual({ id: "p1", is_draft: true });
      expect(mocks.getProduct).toHaveBeenCalledWith("p1");
    });
  });

  describe("update_product — routage selon l'état de la cible", () => {
    it("écrit directement sur un brouillon, et ne dépose aucune révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      mocks.updateDraft.mockResolvedValue({ id: "p1", slug: "galaxy-a55" });

      const r = await tool("update_product").handler(ctx, { id: "p1", name: "Galaxy A55" });

      expect(r.isError).toBeUndefined();
      expect(parse(r)).toEqual({ applied: "direct", id: "p1", slug: "galaxy-a55" });
      expect(mocks.updateDraft).toHaveBeenCalledWith("p1", { name: "Galaxy A55" }, auditFor("update_product"));
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    it("dépose une révision sur une fiche publiée, et n'appelle jamais updateDraft", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      revisionMocks.createRevision.mockResolvedValue({ revisionId: "rev-1", status: "pending" });

      const r = await tool("update_product").handler(ctx, { id: "p1", name: "Nouveau nom" });

      expect(r.isError).toBeUndefined();
      expect(parse(r)).toEqual({
        applied: "revision",
        revision: { id: "rev-1", status: "pending" },
        message: expect.stringContaining("rev-1"),
      });
      expect(revisionMocks.createRevision).toHaveBeenCalledWith({
        target: "product",
        targetId: "p1",
        kind: "update",
        payload: { name: "Nouveau nom" },
        origin: "mcp",
        actor: { id: "admin-1", name: "Admin" },
      });
      expect(mocks.updateDraft).not.toHaveBeenCalled();
    });

    it("refuse attributes sur une fiche publiée, sans déposer de révision (silence interdit)", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      const r = await tool("update_product").handler(ctx, {
        id: "p1",
        attributes: { colors: [], dimensions: {}, specs: [] },
      });
      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("validation_error");
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    it("refuse slug sur une fiche publiée, sans déposer de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      const r = await tool("update_product").handler(ctx, { id: "p1", slug: "nouveau-slug" });
      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("validation_error");
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    it("mappe une RevisionError du dépôt vers isError avec son code", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      revisionMocks.createRevision.mockRejectedValue(new RevisionError("not_found", "Cible introuvable."));
      const r = await tool("update_product").handler(ctx, { id: "p1", name: "X" });
      expect(r.isError).toBe(true);
      expect(parse(r)).toEqual({ code: "not_found", message: "Cible introuvable." });
    });

    it("mappe DraftError vers un résultat isError avec le code (chemin direct)", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      mocks.updateDraft.mockRejectedValue(new DraftError("not_found", "Brouillon introuvable"));
      const r = await tool("update_product").handler(ctx, { id: "p1", name: "X" });
      expect(r.isError).toBe(true);
      expect(parse(r)).toEqual({ code: "not_found", message: "Brouillon introuvable" });
    });

    it("update_product_draft (alias déprécié) route identiquement, avec sa propre attribution d'audit", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      mocks.updateDraft.mockResolvedValue({ id: "p1", slug: "s" });
      const r = await tool("update_product_draft").handler(ctx, { id: "p1", name: "X" });
      expect(parse(r)).toEqual({ applied: "direct", id: "p1", slug: "s" });
      expect(mocks.updateDraft).toHaveBeenCalledWith("p1", { name: "X" }, auditFor("update_product_draft"));
    });
  });

  it("add_product_images rapporte un succès partiel sans isError", async () => {
    mocks.addImagesFromUrls.mockResolvedValue({
      results: [{ url: "https://x/a.jpg", ok: true, image_id: "img-1" }, { url: "https://x/b.jpg", ok: false, reason: "too_large" }],
      primary_image_id: "img-1",
    });
    const r = await tool("add_product_images").handler(ctx, { id: "p1", images: [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }] });
    expect(r.isError).toBeUndefined();
    expect(parse(r).results[1]).toEqual({ url: "https://x/b.jpg", ok: false, reason: "too_large" });
    expect(mocks.addImagesFromUrls).toHaveBeenCalledWith(
      "p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }], auditFor("add_product_images"),
    );
  });

  it("remove_product_image et set_product_variants portent leur attribution d'audit", async () => {
    mocks.removeImage.mockResolvedValue(undefined);
    mocks.setColorVariants.mockResolvedValue({ variants: [], stock_quantity: 0 });
    await tool("remove_product_image").handler(ctx, { id: "p1", image_id: "img-1" });
    expect(mocks.removeImage).toHaveBeenCalledWith("p1", "img-1", auditFor("remove_product_image"));
    await tool("set_product_variants").handler(ctx, { id: "p1", variants: [], uniform_price: true });
    expect(mocks.setColorVariants).toHaveBeenCalledWith("p1", { variants: [], uniform_price: true }, auditFor("set_product_variants"));
  });

  it("delete_product_draft porte son attribution d'audit", async () => {
    mocks.deleteDraft.mockResolvedValue(undefined);
    const r = await tool("delete_product_draft").handler(ctx, { id: "p1" });
    expect(parse(r)).toEqual({ deleted: true });
    expect(mocks.deleteDraft).toHaveBeenCalledWith("p1", auditFor("delete_product_draft"));
  });

  it("search_products délègue avec la limite", async () => {
    mocks.searchProducts.mockResolvedValue([]);
    await tool("search_products").handler(ctx, { query: "galaxy", limit: 7 });
    expect(mocks.searchProducts).toHaveBeenCalledWith("galaxy", 7);
  });
});
