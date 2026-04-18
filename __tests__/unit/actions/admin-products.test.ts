// __tests__/unit/actions/admin-products.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  queryFirst: vi.fn(),
  revalidatePath: vi.fn(),
  nanoid: vi.fn(),
  slugify: vi.fn(),
  // Drizzle: `db.update(table).set(values).where(cond)` — set captures values, where executes.
  drizzleSet: vi.fn(),
  drizzleWhere: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  execute: vi.fn(),
  query: vi.fn(),
}));
vi.mock("@/lib/db/drizzle", () => ({
  getDrizzle: vi.fn(async () => ({
    update: () => ({
      set: (values: unknown) => {
        mocks.drizzleSet(values);
        return {
          where: (cond: unknown) => mocks.drizzleWhere(cond),
        };
      },
    }),
  })),
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

  describe("validation du formulaire", () => {
    it("retourne une erreur si le nom est vide", async () => {
      const result = await updateProduct("prod-1", baseFormData({ name: "" }));
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(mocks.queryFirst).not.toHaveBeenCalled();
      expect(mocks.drizzleWhere).not.toHaveBeenCalled();
    });
  });

  describe("product introuvable", () => {
    it("retourne une erreur si le produit n'existe pas en base", async () => {
      mocks.queryFirst.mockResolvedValueOnce(null);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Produit introuvable" });
      expect(mocks.drizzleWhere).not.toHaveBeenCalled();
    });
  });

  describe("produit déjà publié (is_draft = 0)", () => {
    it("préserve le slug existant sans le régénérer", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "iphone-15-pro" }),
      );
      expect(mocks.slugify).not.toHaveBeenCalled();
    });

    it("préserve le SKU existant sans le régénérer", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ sku: "NET-ABCD1234" }),
      );
      expect(mocks.nanoid).not.toHaveBeenCalled();
    });

    it("n'appelle pas revalidatePath sur /p/ si produit déjà publié", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/p/iphone-15-pro");
    });

    it("retourne une erreur de conflit slug si execute lève une contrainte slug (produit publié)", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.drizzleWhere.mockRejectedValueOnce(new Error("UNIQUE constraint failed: products.slug"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Un conflit de slug s'est produit (collision concurrente). Enregistrez à nouveau pour résoudre le conflit." });
    });

    it("propage une erreur DB inattendue pour un produit publié avec SKU existant", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.drizzleWhere.mockRejectedValueOnce(new Error("D1 unavailable"));
      await expect(updateProduct("prod-1", baseFormData())).rejects.toThrow("D1 unavailable");
    });
  });

  describe("nouveau produit draft (is_draft = 1)", () => {
    it("génère un slug depuis le nom si is_draft = 1", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null); // slug "iphone-15-pro" libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("ABCD1234");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "iphone-15-pro" }),
      );
    });

    it("génère slug avec suffixe -2 si base déjà pris", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce({ id: "other-prod" }) // "iphone-15-pro" pris
        .mockResolvedValueOnce(null); // "iphone-15-pro-2" libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("ABCD1234");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "iphone-15-pro-2" }),
      );
    });

    it("retourne une erreur si slugify produit une chaîne vide", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 });
      mocks.slugify.mockReturnValue("");
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Le nom ne permet pas de générer un slug valide" });
      expect(mocks.drizzleWhere).not.toHaveBeenCalled();
    });

    it("génère un SKU au format NET-XXXXXXXX si sku = null", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ sku: "NET-ABCD1234" }),
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
      mocks.drizzleWhere
        .mockRejectedValueOnce(new Error("UNIQUE constraint failed: products.sku"))
        .mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleWhere).toHaveBeenCalledTimes(2);
      expect(mocks.drizzleSet).toHaveBeenLastCalledWith(
        expect.objectContaining({ sku: "NET-BBBBBBBB" }),
      );
    });

    it("retourne une erreur après 3 collisions SKU consécutives", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("xxxxxxxx");
      mocks.drizzleWhere.mockRejectedValue(new Error("UNIQUE constraint failed: products.sku"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Impossible de générer un SKU unique. Veuillez contacter le support." });
      expect(mocks.drizzleWhere).toHaveBeenCalledTimes(3);
    });

    it("propage les erreurs execute non liées à une contrainte unique", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.drizzleWhere.mockRejectedValue(new Error("D1 unavailable"));
      await expect(updateProduct("prod-1", baseFormData())).rejects.toThrow("D1 unavailable");
    });

    it("retourne une erreur de conflit slug lors d'une collision slug pendant la génération de SKU", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.drizzleWhere.mockRejectedValue(new Error("UNIQUE constraint failed: products.slug"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Un conflit de slug s'est produit (collision concurrente). Enregistrez à nouveau pour résoudre le conflit." });
    });

    it("appelle revalidatePath sur /p/{slug} lors de la première publication", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/iphone-15-pro");
    });

    it("préserve le SKU existant si is_draft = 1 mais sku déjà défini (re-draft)", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: "NET-EXISTING1", is_draft: 1 })
        .mockResolvedValueOnce(null); // slug libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ sku: "NET-EXISTING1" }),
      );
      expect(mocks.nanoid).not.toHaveBeenCalled();
    });

    it("ne génère pas de suffixe -2 si le slug de base est disponible (exclusion du produit courant via AND id != ?)", async () => {
      // Simulates re-saving a draft: slug check returns null (current product's own slug excluded)
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null); // slug "iphone-15-pro" is free (own draft excluded)
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      // Must use bare slug, not "iphone-15-pro-2"
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "iphone-15-pro" }),
      );
      expect(mocks.drizzleSet).not.toHaveBeenCalledWith(
        expect.objectContaining({ slug: "iphone-15-pro-2" }),
      );
      // Only 2 queryFirst calls: 1 for existing product + 1 for slug check
      expect(mocks.queryFirst).toHaveBeenCalledTimes(2);
    });

    it("retourne une erreur si toutes les variantes de slug sont prises (épuisement)", async () => {
      // First queryFirst is for the existing product, subsequent ones all return "taken"
      mocks.queryFirst.mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 });
      // All slug candidates are taken (simulate by always returning a row)
      mocks.queryFirst.mockResolvedValue({ id: "other-prod" });
      mocks.slugify.mockReturnValue("samsung-galaxy");
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Impossible de générer un slug unique pour ce nom" });
      expect(mocks.drizzleWhere).not.toHaveBeenCalled();
      // 1 fetch for existing product + 100 slug uniqueness checks = 101 total
      expect(mocks.queryFirst).toHaveBeenCalledTimes(101);
    });
  });

  describe("produit publié sans SKU (données migrées)", () => {
    it("génère un SKU pour un produit publié sans SKU (données migrées)", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "old-product", sku: null, is_draft: 0 });
      mocks.nanoid.mockReturnValue("migrated1");
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.drizzleSet).toHaveBeenCalledWith(
        expect.objectContaining({ sku: "NET-MIGRATED1", slug: "old-product" }),
      );
      // slug preserved, no revalidatePath on /p/ since is_draft was already 0
      expect(mocks.revalidatePath).not.toHaveBeenCalledWith(expect.stringContaining("/p/"));
      expect(mocks.slugify).not.toHaveBeenCalled();
    });

    it("ignore tout slug soumis manuellement dans le FormData", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "existing-slug", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.drizzleWhere.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData({ slug: "my-manual-slug" }));
      expect(result.success).toBe(true);
      // The manually submitted slug must NOT appear in the UPDATE values
      const setCall = mocks.drizzleSet.mock.calls[0][0] as { slug: string };
      expect(setCall.slug).not.toBe("my-manual-slug");
      // The existing slug IS preserved
      expect(setCall.slug).toBe("existing-slug");
    });
  });
});
