import { describe, it, expect, vi, beforeEach } from "vitest";
import { textOf, type ToolResult } from "@/lib/mcp/result";
import { RETIRED_STORY_FIELD_NAMES } from "@/lib/validations/mcp-product";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import type { McpContext } from "@/lib/mcp/context";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(), updateDraft: vi.fn(), getProduct: vi.fn(), getProductDraftState: vi.fn(),
  searchProducts: vi.fn(), deleteDraft: vi.fn(),
  addImagesFromUrls: vi.fn(), removeImage: vi.fn(), setColorVariants: vi.fn(), findProductImage: vi.fn(),
  countProductImages: vi.fn(),
}));
const revisionMocks = vi.hoisted(() => ({ createRevision: vi.fn() }));
const storageMocks = vi.hoisted(() => ({ fetchAndUploadImage: vi.fn(), deleteFromR2: vi.fn() }));

vi.mock("@/lib/db/product-drafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/product-drafts")>("@/lib/db/product-drafts");
  return { ...actual, ...mocks };
});
// `createRevision` mocké ; `RevisionError` gardée réelle pour l'instanceof de toolError.
vi.mock("@/lib/db/revisions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/revisions")>("@/lib/db/revisions");
  return { ...actual, createRevision: revisionMocks.createRevision };
});
// `fetchAndUploadImage` mocké (téléversement R2 au dépôt d'une révision d'images) ;
// `deleteFromR2` mocké (nettoyage si le dépôt échoue après le téléversement).
vi.mock("@/lib/storage/fetch-image", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage/fetch-image")>("@/lib/storage/fetch-image");
  return { ...actual, fetchAndUploadImage: storageMocks.fetchAndUploadImage };
});
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: storageMocks.deleteFromR2, uploadToR2: vi.fn() }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB in this test"); } }));

import { DraftError } from "@/lib/db/product-drafts";
import { RevisionError } from "@/lib/db/revisions";
import { productTools, writePath } from "@/lib/mcp/tools/products";
import { createMcpServer } from "@/lib/mcp/server";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
// productTools is typed ToolDefinition[] (base shape), so handler accepts any object literal here.
const tool = (name: string) => productTools.find((t) => t.name === name)!;
const parse = (r: ToolResult) => JSON.parse(textOf(r));
/** What every write must hand to product-drafts, which commits it with the mutation. */
const auditFor = (tool: string) => ({ actor: { id: "admin-1", name: "Admin" }, details: { via: "mcp", tool, client_id: "client-1" } });

beforeEach(() => {
  vi.clearAllMocks();
  // Défaut sûr : une fiche sans image ne dépasse jamais le plafond. Les tests
  // du refus au dépôt (limit_exceeded) écrasent explicitement cette valeur.
  mocks.countProductImages.mockResolvedValue(0);
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
      "publish_product", "reactivate_product", "remove_product_image", "search_products", "set_product_variants", "update_product",
      "update_product_draft", "withdraw_product",
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

  describe("add_product_images — routage selon l'état de la cible", () => {
    it("attache directement sur un brouillon, rapporte un succès partiel sans isError, sans dépôt de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      mocks.addImagesFromUrls.mockResolvedValue({
        results: [{ url: "https://x/a.jpg", ok: true, image_id: "img-1" }, { url: "https://x/b.jpg", ok: false, reason: "too_large" }],
        primary_image_id: "img-1",
      });
      const r = await tool("add_product_images").handler(ctx, { id: "p1", images: [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }] });
      expect(r.isError).toBeUndefined();
      expect(parse(r).applied).toBe("direct");
      expect(parse(r).results[1]).toEqual({ url: "https://x/b.jpg", ok: false, reason: "too_large" });
      expect(mocks.addImagesFromUrls).toHaveBeenCalledWith(
        "p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }], auditFor("add_product_images"),
      );
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    // Discriminant obligatoire (dispatch tâche 7) : une image ajoutée à une
    // fiche PUBLIÉE doit être téléversée sur R2 AU DÉPÔT (pas à
    // l'application), et la révision doit porter la clé R2 — jamais l'URL
    // source — sans jamais toucher au produit lui-même (aucun appel à
    // addImagesFromUrls, réservé au chemin brouillon).
    it("sur une fiche publiée : téléverse vers R2 au dépôt et dépose une révision portant la clé R2, sans toucher au produit", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      storageMocks.fetchAndUploadImage.mockResolvedValue({
        ok: true, key: "products/p1/abc123.jpg", contentType: "image/jpeg", size: 1234,
      });
      revisionMocks.createRevision.mockResolvedValue({ revisionId: "rev-9", status: "pending" });

      const r = await tool("add_product_images").handler(ctx, { id: "p1", images: [{ url: "https://x/a.jpg", alt: "Photo" }] });

      expect(r.isError).toBeUndefined();
      expect(parse(r)).toEqual({
        applied: "revision",
        results: [{ url: "https://x/a.jpg", ok: true }],
        revision: { id: "rev-9", status: "pending" },
        message: expect.stringContaining("rev-9"),
      });
      expect(storageMocks.fetchAndUploadImage).toHaveBeenCalledWith("p1", "https://x/a.jpg");
      expect(revisionMocks.createRevision).toHaveBeenCalledWith({
        target: "product",
        targetId: "p1",
        kind: "add_images",
        payload: { images: [{ key: "products/p1/abc123.jpg", alt: "Photo" }] },
        origin: "mcp",
        actor: { id: "admin-1", name: "Admin" },
      });
      // Ne touche jamais le produit ni ses images directement : c'est la
      // révision, pas cet outil, qui portera l'écriture — voir /revisions.
      expect(mocks.addImagesFromUrls).not.toHaveBeenCalled();
    });

    // B2 (revue de phase) : sur une fiche publiée, sans ce refus précoce, le
    // dépôt téléverserait vers R2 puis créerait une révision que
    // `applyRevision` ne pourrait jamais appliquer entièrement — voir la
    // garde symétrique côté application (lib/db/revisions.ts).
    it("refuse limit_exceeded au dépôt si le total dépasserait le plafond, sans téléverser ni déposer de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      mocks.countProductImages.mockResolvedValue(11);

      const r = await tool("add_product_images").handler(ctx, {
        id: "p1",
        images: [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }],
      });

      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("limit_exceeded");
      expect(storageMocks.fetchAndUploadImage).not.toHaveBeenCalled();
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    it("nettoie l'objet R2 déjà téléversé si le dépôt de la révision échoue ensuite (pas d'orphelin)", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      storageMocks.fetchAndUploadImage.mockResolvedValue({
        ok: true, key: "products/p1/abc123.jpg", contentType: "image/jpeg", size: 1234,
      });
      revisionMocks.createRevision.mockRejectedValue(new RevisionError("not_found", "Cible introuvable."));

      const r = await tool("add_product_images").handler(ctx, { id: "p1", images: [{ url: "https://x/a.jpg" }] });

      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("not_found");
      expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/abc123.jpg");
    });
  });

  describe("remove_product_image — routage selon l'état de la cible", () => {
    it("supprime directement sur un brouillon (attribution d'audit), sans dépôt de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      mocks.removeImage.mockResolvedValue(undefined);
      const r = await tool("remove_product_image").handler(ctx, { id: "p1", image_id: "img-1" });
      expect(parse(r)).toEqual({ applied: "direct", removed: true });
      expect(mocks.removeImage).toHaveBeenCalledWith("p1", "img-1", auditFor("remove_product_image"));
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    it("sur une fiche publiée : dépose une révision remove_image, sans jamais appeler removeImage", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      mocks.findProductImage.mockResolvedValue({ id: "img-1", url: "products/p1/abc.jpg", is_primary: false });
      revisionMocks.createRevision.mockResolvedValue({ revisionId: "rev-2", status: "pending" });

      const r = await tool("remove_product_image").handler(ctx, { id: "p1", image_id: "img-1" });

      expect(r.isError).toBeUndefined();
      expect(revisionMocks.createRevision).toHaveBeenCalledWith({
        target: "product", targetId: "p1", kind: "remove_image",
        payload: { image_id: "img-1" }, origin: "mcp", actor: { id: "admin-1", name: "Admin" },
      });
      expect(mocks.removeImage).not.toHaveBeenCalled();
    });

    it("refuse not_found sur une fiche publiée si l'image n'existe pas sur ce produit, sans déposer de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      mocks.findProductImage.mockResolvedValue(null);
      const r = await tool("remove_product_image").handler(ctx, { id: "p1", image_id: "img-x" });
      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("not_found");
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });
  });

  describe("set_product_variants — routage selon l'état de la cible", () => {
    it("écrit directement sur un brouillon (attribution d'audit), sans dépôt de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      mocks.setColorVariants.mockResolvedValue({ variants: [], stock_quantity: 0 });
      const r = await tool("set_product_variants").handler(ctx, { id: "p1", variants: [], uniform_price: true });
      expect(parse(r)).toEqual({ applied: "direct", variants: [], stock_quantity: 0 });
      expect(mocks.setColorVariants).toHaveBeenCalledWith("p1", { variants: [], uniform_price: true }, auditFor("set_product_variants"));
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });

    it("sur une fiche publiée : dépose une révision set_variants, sans jamais appeler setColorVariants", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      revisionMocks.createRevision.mockResolvedValue({ revisionId: "rev-3", status: "pending" });

      const r = await tool("set_product_variants").handler(ctx, {
        id: "p1", variants: [{ color_name: "Noir", color_hex: "#000000", stock: 5 }], uniform_price: true,
      });

      expect(r.isError).toBeUndefined();
      expect(revisionMocks.createRevision).toHaveBeenCalledWith({
        target: "product", targetId: "p1", kind: "set_variants",
        payload: { variants: [{ color_name: "Noir", color_hex: "#000000", stock: 5 }], uniform_price: true },
        origin: "mcp", actor: { id: "admin-1", name: "Admin" },
      });
      expect(mocks.setColorVariants).not.toHaveBeenCalled();
    });
  });

  describe("publish_product", () => {
    it("dépose une révision publish à payload vide sur un brouillon", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
      revisionMocks.createRevision.mockResolvedValue({ revisionId: "rev-p", status: "pending" });

      const r = await tool("publish_product").handler(ctx, { id: "p1" });

      expect(r.isError).toBeUndefined();
      expect(parse(r)).toEqual({
        applied: "revision",
        revision: { id: "rev-p", status: "pending" },
        message: expect.stringContaining("rev-p"),
      });
      // Discriminant obligatoire (dispatch tâche 8) : c'est createRevision,
      // jamais l'outil, qui porte le changement — payload vide, is_draft
      // n'apparaît nulle part ici.
      expect(revisionMocks.createRevision).toHaveBeenCalledWith({
        target: "product", targetId: "p1", kind: "publish", payload: {},
        origin: "mcp", actor: { id: "admin-1", name: "Admin" },
      });
      expect(mocks.updateDraft).not.toHaveBeenCalled();
    });

    // Discriminant obligatoire (dispatch tâche 8) : refuse une republication.
    it("refuse avec conflict sur une fiche déjà publiée, sans déposer de révision", async () => {
      mocks.getProductDraftState.mockResolvedValue({ is_draft: false });
      const r = await tool("publish_product").handler(ctx, { id: "p1" });
      expect(r.isError).toBe(true);
      expect(parse(r).code).toBe("conflict");
      expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    });
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

/**
 * Le refus des champs Story retirés, pris là où un client le subit : à travers
 * le SDK, pas sur le schéma seul. C'est le SDK qui valide l'entrée avant
 * d'appeler le `handler` (lib/mcp/tools/types.ts) — un test qui n'interroge
 * que `createDraftSchema` ne dit rien de ce que le client reçoit, ni du fait
 * que rien n'a été écrit.
 *
 * Les deux assertions comptent, et pour des raisons différentes : le message
 * doit nommer le remplaçant (sinon l'appelant ne sait pas quoi faire), et
 * `createDraft` ne doit pas avoir été appelé (sinon le refus se superpose à
 * une écriture — le silence d'origine, en pire).
 */
describe("contrat : un champ Story retiré ne passe plus par le SDK", () => {
  /** Le texte que le client reçoit, quel que soit le nombre de blocs. */
  const textOf = (r: { content?: unknown }) =>
    (Array.isArray(r.content) ? r.content : [])
      .map((c) => (typeof (c as { text?: unknown }).text === "string" ? (c as { text: string }).text : ""))
      .join("\n");

  async function connected() {
    const server = createMcpServer(ctx);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return client;
  }

  it("create_product_draft refuse `tagline` en nommant description_html, et n'écrit rien", async () => {
    mocks.createDraft.mockResolvedValue({ id: "p1", slug: "galaxy-a55" });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "create_product_draft",
        arguments: { name: "Galaxy A55", category_id: "cat-1", tagline: "Accroche" },
      });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain("`tagline` a été retiré du contrat");
      expect(textOf(r)).toContain("description_html");
      expect(mocks.createDraft).not.toHaveBeenCalled();
    } finally {
      await client.close();
    }
  });

  /**
   * LE cas relevé en service le 2026-10-02. Un assistant a écrit
   * `base_price: 35000`, reçu un succès, et le prix est resté à 0 — `z.object`
   * élaguait la clé. Il a recommencé sous trois autres formes, toutes
   * « réussies », avant de recharger la définition de l'outil pour découvrir
   * que le champ s'appelle `pricing.base_price`.
   *
   * Un succès pour une écriture vide est pire qu'un refus : il apprend à
   * l'appelant qu'il peut croire un succès.
   */
  it("update_product refuse un nom de champ inventé au lieu de l'ignorer", async () => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    mocks.updateDraft.mockResolvedValue({ id: "p1", slug: "s" });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "update_product",
        arguments: { id: "p1", base_price: 35000 },
      });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain("Champ inconnu");
      // Refuser sans dire quoi employer ne ferait que déplacer les essais à
      // l'aveugle : le message liste les champs acceptés, dont `pricing`.
      expect(textOf(r)).toContain("pricing");
      // Mais PAS les champs déclarés pour être refusés : les annoncer comme
      // acceptés enverrait l'appelant droit vers un second refus. Mesuré sur
      // les vingt outils — trois en déclarent cinq dans ce cas.
      // Lue, pas recopiée : ma première version en listait quatre sur cinq et
      // omettait `faq` — précisément le plus dangereux, puisqu'un `faq_html`
      // légitime vit juste à côté et que les deux paraissent plausibles.
      expect(RETIRED_STORY_FIELD_NAMES.length).toBeGreaterThanOrEqual(5);
      for (const refuse of RETIRED_STORY_FIELD_NAMES) {
        expect(textOf(r), `${refuse} annoncé comme acceptable`).not.toMatch(
          new RegExp(`n'accepte que[^.]*\\b${refuse}\\b`),
        );
      }
      expect(mocks.updateDraft).not.toHaveBeenCalled();
    } finally {
      await client.close();
    }
  });

  it("un champ légitime passe toujours : le SDK n'ajoute aucune clé aux arguments", async () => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    mocks.updateDraft.mockResolvedValue({ id: "p1", slug: "s" });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "update_product",
        arguments: { id: "p1", pricing: { base_price: 35000 } },
      });
      expect(r.isError).toBeFalsy();
      // Pas seulement « appelée » : AVEC la valeur. Retirer `pricing` du patch
      // dans le handler laissait ce test au vert — il gardait l'absence
      // d'erreur, pas l'écriture, c'est-à-dire exactement l'incident d'origine.
      expect(mocks.updateDraft).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ pricing: { base_price: 35000 } }),
        expect.anything(),
      );
    } finally {
      await client.close();
    }
  });

  /**
   * LE défaut que la racine stricte ne fermait pas, et vers lequel elle
   * poussait : le message répond « n'accepte que : …, pricing, … », donc
   * l'assistant corrige `base_price` en `pricing: { … }` — et s'il se trompe à
   * l'intérieur, il retombait sur un succès pour une écriture vide, cette fois
   * avec la conviction d'avoir le bon conteneur.
   *
   * Mesuré par une relecture avant correction : `pricing: { basePrice }` rendait
   * un succès et écrivait `pricing: {}`.
   */
  it.each([
    ["pricing", { pricing: { basePrice: 35000 } }, "pricing"],
    ["seo", { seo: { metaTitle: "x" } }, "seo"],
  ])("refuse un champ inconnu IMBRIQUÉ dans %s, au lieu de l'élaguer", async (_nom, args, chemin) => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    mocks.updateDraft.mockResolvedValue({ id: "p1", slug: "s" });
    const client = await connected();
    try {
      const r = await client.callTool({ name: "update_product", arguments: { id: "p1", ...args } });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain(`Champ inconnu dans « ${chemin} »`);
      expect(mocks.updateDraft).not.toHaveBeenCalled();
    } finally {
      await client.close();
    }
  });

  /**
   * Un objet imbriqué reçu avec le MAUVAIS TYPE ne doit pas se voir répondre
   * « champ inconnu » : aucun champ inconnu n'a été envoyé. Une chaîne passée
   * à `error` s'appliquait à toutes les issues, y compris `invalid_type`, et
   * neuf chemins mentaient ainsi.
   *
   * C'est l'erreur que le refus de la racine rend probable, puisque son
   * message nomme `pricing` sans dire que c'est un objet : répondre « champ
   * inconnu » y renvoyait l'appelant chercher une clé fautive inexistante.
   */
  it.each([
    ["un nombre", 35000],
    ["null", null],
    ["une chaîne", "gratuit"],
  ])("un pricing reçu comme %s dit le vrai problème, pas « champ inconnu »", async (_nom, valeur) => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    const client = await connected();
    try {
      const r = await client.callTool({ name: "update_product", arguments: { id: "p1", pricing: valeur } });
      expect(r.isError).toBe(true);
      expect(textOf(r)).not.toContain("Champ inconnu");
      expect(textOf(r)).toMatch(/expected object/i);
    } finally {
      await client.close();
    }
  });

  it("refuse un champ inconnu dans un élément de variants[]", async () => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "set_product_variants",
        arguments: { id: "p1", variants: [{ color_name: "Noir", color_hex: "#000000", stock: 1, prix: 500 }] },
      });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain("variants[]");
      // Sans ça, la variante partait à l'écriture SANS prix, silencieusement.
      expect(textOf(r)).toContain("price");
    } finally {
      await client.close();
    }
  });

  // Les cinq noms Story sont DÉCLARÉS dans la forme, donc connus : leur message
  // sur mesure, qui nomme le remplaçant, doit continuer de l'emporter sur le
  // message générique.
  it("un champ Story garde son message propre, plus précis que le refus générique", async () => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "update_product",
        arguments: { id: "p1", tagline: "Accroche" },
      });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain("a été retiré du contrat");
      expect(textOf(r)).not.toContain("Champ inconnu");
    } finally {
      await client.close();
    }
  });

  it("update_product refuse `faq` en nommant faq_html, et n'écrit rien", async () => {
    mocks.getProductDraftState.mockResolvedValue({ is_draft: true });
    mocks.updateDraft.mockResolvedValue({ id: "p1", slug: "s" });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "update_product",
        arguments: { id: "p1", faq: [{ question: "Q", answer: "R" }] },
      });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain("`faq` a été retiré du contrat");
      expect(textOf(r)).toContain("faq_html");
      expect(mocks.updateDraft).not.toHaveBeenCalled();
    } finally {
      await client.close();
    }
  });

  it("le même appel sans champ retiré passe — le refus ne mord pas le cas normal", async () => {
    mocks.createDraft.mockResolvedValue({ id: "p1", slug: "galaxy-a55" });
    const client = await connected();
    try {
      const r = await client.callTool({
        name: "create_product_draft",
        arguments: { name: "Galaxy A55", category_id: "cat-1", description_html: "<p>Texte</p>" },
      });
      expect(r.isError).toBeFalsy();
      expect(mocks.createDraft).toHaveBeenCalledTimes(1);
    } finally {
      await client.close();
    }
  });
});
