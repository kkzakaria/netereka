import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpContext } from "@/lib/mcp/context";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(), updateDraft: vi.fn(), getDraft: vi.fn(), searchProducts: vi.fn(), deleteDraft: vi.fn(),
  addImagesFromUrls: vi.fn(), removeImage: vi.fn(), setColorVariants: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/lib/db/product-drafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/product-drafts")>("@/lib/db/product-drafts");
  return { ...actual, ...mocks };
});
vi.mock("@/lib/db/admin/audit-log", () => ({ createAuditLog: mocks.createAuditLog }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB in this test"); } }));

import { DraftError } from "@/lib/db/product-drafts";
import { productTools } from "@/lib/mcp/tools/products";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
// productTools is typed ToolDefinition[] (base shape), so handler accepts any object literal here.
const tool = (name: string) => productTools.find((t) => t.name === name)!;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createAuditLog.mockResolvedValue(undefined);
});

describe("productTools", () => {
  it("expose exactement les outils du contrat", () => {
    expect(productTools.map((t) => t.name).sort()).toEqual([
      "add_product_images", "create_product_draft", "delete_product_draft", "get_product_draft",
      "remove_product_image", "search_products", "set_product_variants", "update_product_draft",
    ]);
  });

  it("create_product_draft renvoie id, slug, edit_url et écrit l'audit", async () => {
    mocks.createDraft.mockResolvedValue({ id: "p1", slug: "galaxy-a55" });
    const r = await tool("create_product_draft").handler(ctx, { name: "Galaxy A55", category_id: "cat-1" });
    expect(r.isError).toBeUndefined();
    expect(parse(r)).toEqual({ id: "p1", slug: "galaxy-a55", edit_url: "/products/p1/edit" });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1", actorName: "Admin", action: "product.draft_created", targetType: "product", targetId: "p1",
      details: JSON.stringify({ via: "mcp", tool: "create_product_draft", client_id: "client-1" }),
    }));
  });

  it("mappe DraftError vers un résultat isError avec le code", async () => {
    mocks.updateDraft.mockRejectedValue(new DraftError("not_found", "Brouillon introuvable"));
    const r = await tool("update_product_draft").handler(ctx, { id: "p1", name: "X" });
    expect(r.isError).toBe(true);
    expect(parse(r)).toEqual({ code: "not_found", message: "Brouillon introuvable" });
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("mappe une erreur inattendue vers internal_error sans détail", async () => {
    mocks.getDraft.mockRejectedValue(new Error("D1 exploded with secret details"));
    const r = await tool("get_product_draft").handler(ctx, { id: "p1" });
    expect(r.isError).toBe(true);
    expect(parse(r).code).toBe("internal_error");
    expect(parse(r).message).not.toContain("secret");
  });

  it("add_product_images rapporte un succès partiel sans isError", async () => {
    mocks.addImagesFromUrls.mockResolvedValue({
      results: [{ url: "https://x/a.jpg", ok: true, image_id: "img-1" }, { url: "https://x/b.jpg", ok: false, reason: "too_large" }],
      primary_image_id: "img-1",
    });
    const r = await tool("add_product_images").handler(ctx, { id: "p1", images: [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }] });
    expect(r.isError).toBeUndefined();
    expect(parse(r).results[1]).toEqual({ url: "https://x/b.jpg", ok: false, reason: "too_large" });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "product.draft_updated" }));
  });

  it("delete_product_draft audite la suppression", async () => {
    mocks.deleteDraft.mockResolvedValue(undefined);
    const r = await tool("delete_product_draft").handler(ctx, { id: "p1" });
    expect(parse(r)).toEqual({ deleted: true });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "product.draft_deleted", targetId: "p1" }));
  });

  it("search_products délègue avec la limite", async () => {
    mocks.searchProducts.mockResolvedValue([]);
    await tool("search_products").handler(ctx, { query: "galaxy", limit: 7 });
    expect(mocks.searchProducts).toHaveBeenCalledWith("galaxy", 7);
  });
});
