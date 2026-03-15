// __tests__/unit/actions/admin-products.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  queryFirst: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
  nanoid: vi.fn(),
  slugify: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  execute: mocks.execute,
  query: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("nanoid", () => ({ nanoid: mocks.nanoid }));
vi.mock("@/lib/utils", () => ({ slugify: mocks.slugify }));

import { updateProduct } from "@/actions/admin/products";

const baseFormData = (overrides: Record<string, string> = {}) => {
  const fd = new FormData();
  fd.append("name", "iPhone 15 Pro");
  fd.append("category_id", "cat-1");
  fd.append("brand", "Apple");
  fd.append("base_price", "850000");
  fd.append("stock_quantity", "10");
  fd.append("low_stock_threshold", "5");
  fd.append("is_active", "1");
  fd.append("is_featured", "0");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
};

describe("updateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
  });

  describe("product introuvable", () => {
    it("retourne une erreur si le produit n'existe pas en base", async () => {
      mocks.queryFirst.mockResolvedValueOnce(null);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Produit introuvable" });
      expect(mocks.execute).not.toHaveBeenCalled();
    });
  });

  describe("produit déjà publié (is_draft = 0)", () => {
    it("préserve le slug existant sans le régénérer", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["iphone-15-pro"])
      );
      expect(mocks.slugify).not.toHaveBeenCalled();
    });

    it("préserve le SKU existant sans le régénérer", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.execute.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-ABCD1234"])
      );
      expect(mocks.nanoid).not.toHaveBeenCalled();
    });

    it("n'appelle pas revalidatePath sur /p/ si produit déjà publié", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.execute.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/p/iphone-15-pro");
    });
  });

  describe("nouveau produit draft (is_draft = 1)", () => {
    it("génère un slug depuis le nom si is_draft = 1", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null); // slug "iphone-15-pro" libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("ABCD1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["iphone-15-pro"])
      );
    });

    it("génère slug avec suffixe -2 si base déjà pris", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce({ id: "other-prod" }) // "iphone-15-pro" pris
        .mockResolvedValueOnce(null); // "iphone-15-pro-2" libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("ABCD1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["iphone-15-pro-2"])
      );
    });

    it("retourne une erreur si slugify produit une chaîne vide", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 });
      mocks.slugify.mockReturnValue("");
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Le nom ne permet pas de générer un slug valide" });
      expect(mocks.execute).not.toHaveBeenCalled();
    });

    it("génère un SKU au format NET-XXXXXXXX si sku = null", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-ABCD1234"])
      );
    });

    it("réessaie la génération SKU en cas de collision UNIQUE constraint", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid
        .mockReturnValueOnce("aaaaaaaa") // 1er SKU — collision
        .mockReturnValueOnce("bbbbbbbb"); // 2e SKU — succès
      mocks.execute
        .mockRejectedValueOnce(new Error("UNIQUE constraint failed: products.sku"))
        .mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledTimes(2);
      expect(mocks.execute).toHaveBeenLastCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-BBBBBBBB"])
      );
    });

    it("retourne une erreur après 3 collisions SKU consécutives", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("xxxxxxxx");
      mocks.execute.mockRejectedValue(new Error("UNIQUE constraint failed: products.sku"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Impossible de générer un SKU unique, veuillez réessayer" });
      expect(mocks.execute).toHaveBeenCalledTimes(3);
    });

    it("propage les erreurs execute non liées à une contrainte unique", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockRejectedValue(new Error("D1 unavailable"));
      await expect(updateProduct("prod-1", baseFormData())).rejects.toThrow("D1 unavailable");
    });

    it("retourne une erreur de conflit slug lors d'une collision slug pendant la génération de SKU", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockRejectedValue(new Error("UNIQUE constraint failed: products.slug"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Conflit de slug, veuillez réessayer" });
    });

    it("appelle revalidatePath sur /p/{slug} lors de la première publication", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/iphone-15-pro");
    });

    it("préserve le SKU existant si is_draft = 1 mais sku déjà défini (re-draft)", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: "NET-EXISTING1", is_draft: 1 })
        .mockResolvedValueOnce(null); // slug libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-EXISTING1"])
      );
      expect(mocks.nanoid).not.toHaveBeenCalled();
    });
  });
});
