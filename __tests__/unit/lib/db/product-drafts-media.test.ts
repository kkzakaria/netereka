import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => ({
  current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock>,
}));
const mocks = vi.hoisted(() => ({ deleteFromR2: vi.fn(), fetchAndUploadImage: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: mocks.deleteFromR2, uploadToR2: vi.fn() }));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: mocks.fetchAndUploadImage }));

import { addImagesFromUrls, removeImage, setColorVariants } from "@/lib/db/product-drafts";

const sqlOf = (s: BoundStatement) => s.sql.replace(/\s+/g, " ");
const DRAFT_ROW = [["p1", "slug"]];

beforeEach(() => {
  d1.current = createD1Mock();
  mocks.deleteFromR2.mockReset().mockResolvedValue(undefined);
  mocks.fetchAndUploadImage.mockReset().mockImplementation(async (_id: string, url: string) =>
    ({ ok: true, key: `products/p1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));
});

describe("addImagesFromUrls", () => {
  it("refuse au-delà de 12 images au total, avant tout téléchargement", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (/from "product_images"/i.test(stmt.sql)) return Array.from({ length: 11 }, (_, i) => [`img-${i}`, i === 0 ? 1 : 0, i]);
      return [];
    });
    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }]))
      .rejects.toMatchObject({ code: "limit_exceeded" });
    expect(mocks.fetchAndUploadImage).not.toHaveBeenCalled();
  });

  it("insère les images réussies, marque la première primaire, rapporte les échecs", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    mocks.fetchAndUploadImage.mockImplementation(async (_id: string, url: string) =>
      url.endsWith("bad.jpg") ? { ok: false, reason: "bad_status", status: 404 }
        : { ok: true, key: `products/p1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 1 });

    const r = await addImagesFromUrls("p1", [{ url: "https://x/bad.jpg" }, { url: "https://x/a.jpg", alt: "A" }, { url: "https://x/b.jpg" }]);

    expect(r.results).toEqual([
      { url: "https://x/bad.jpg", ok: false, reason: "bad_status" },
      { url: "https://x/a.jpg", ok: true, image_id: expect.any(String) },
      { url: "https://x/b.jpg", ok: true, image_id: expect.any(String) },
    ]);
    expect(r.primary_image_id).toBe(r.results[1].image_id);
    const inserts = d1.current!.batchStatements().filter((s) => /insert into "product_images"/i.test(s.sql));
    expect(inserts).toHaveLength(2);
    expect(inserts[0].params).toEqual(expect.arrayContaining(["products/p1/a.jpg", "A", 1, 0]));  // is_primary 1, sort 0
    expect(inserts[1].params).toEqual(expect.arrayContaining(["products/p1/b.jpg", 0, 1]));
  });

  it("garde la primaire existante et poursuit le sort_order", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (/from "product_images"/i.test(stmt.sql)) return [["img-0", 1, 0], ["img-1", 0, 4]];
      return [];
    });
    const r = await addImagesFromUrls("p1", [{ url: "https://x/c.jpg" }]);
    expect(r.primary_image_id).toBe("img-0");
    const insert = d1.current!.batchStatements()[0];
    expect(insert.params).toEqual(expect.arrayContaining([0, 5]));
  });

  it("nettoie R2 si le batch échoue", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    d1.current!.batch.mockRejectedValue(new Error("D1 down"));
    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }])).rejects.toThrow("D1 down");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
  });

  it("journalise les échecs de nettoyage R2 après un batch en échec", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    d1.current!.batch.mockRejectedValue(new Error("D1 down"));
    mocks.deleteFromR2.mockImplementation(async (key: string) => {
      if (key === "products/p1/a.jpg") throw new Error("R2 unreachable");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }]))
      .rejects.toThrow("D1 down");

    expect(warnSpy).toHaveBeenCalledWith(
      "[product-drafts] orphan R2 object after failed image batch",
      "products/p1/a.jpg",
      expect.any(Error),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      "products/p1/b.jpg",
      expect.anything(),
    );
    warnSpy.mockRestore();
  });
});

describe("removeImage", () => {
  it("supprime la ligne, promeut la suivante en primaire et efface l'objet R2", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (/from "product_images"/i.test(stmt.sql) && /"id" = \?/i.test(stmt.sql)) return [["img-0", "products/p1/a.jpg", 1]];
      if (/from "product_images"/i.test(stmt.sql)) return [["img-1"]];
      return [];
    });
    await removeImage("p1", "img-0");
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts[0]).toMatch(/delete from "product_images"/i);
    expect(stmts[1]).toMatch(/update "product_images" set "is_primary" = \?/i);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
  });

  it("lève not_found pour une image d'un autre produit", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    await expect(removeImage("p1", "img-x")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("setColorVariants", () => {
  // select({ id, slug, base_price, compare_price }) → positional row
  const PRODUCT_ROW = [["p1", "slug", 100000, 120000]];

  it("crée, met à jour et supprime les variantes couleur, et recalcule le stock", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/from "products"/i.test(stmt.sql)) return PRODUCT_ROW;
      if (/from "product_variants"/i.test(stmt.sql) && /"attributes"/i.test(stmt.sql)) {
        return [["v-noir", JSON.stringify({ color: "Noir:#000000" })], ["v-bleu", JSON.stringify({ color: "Bleu:#0000ff" })]];
      }
      return [];
    });

    const r = await setColorVariants("p1", {
      uniform_price: false,
      variants: [
        { color_name: "Noir", color_hex: "#000000", stock: 2, price: 90000 },
        { color_name: "Rouge", color_hex: "#ff0000", stock: 3 },
      ],
    });

    expect(r.stock_quantity).toBe(5);
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts.some((s) => /update "product_variants" set/i.test(s))).toBe(true);        // Noir
    expect(stmts.some((s) => /insert into "product_variants"/i.test(s))).toBe(true);      // Rouge
    expect(stmts.some((s) => /update "product_images" set "variant_id" = \?/i.test(s))).toBe(true); // Bleu images detached
    expect(stmts.some((s) => /delete from "product_variants" where "product_variants"."id" = \?/i.test(s))).toBe(true); // Bleu
    expect(stmts[stmts.length - 1]).toMatch(/update "products" set "stock_quantity" = \?.*"is_draft" = \?/i);
    const rougeInsert = d1.current!.batchStatements().find((s) => /insert into "product_variants"/i.test(s.sql))!;
    expect(rougeInsert.params).toEqual(expect.arrayContaining(["Rouge", 100000, JSON.stringify({ color: "Rouge:#ff0000" })])); // price → base_price
  });

  it("applique le prix de base à toutes les variantes en uniform_price", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/from "products"/i.test(stmt.sql) ? PRODUCT_ROW : []));
    await setColorVariants("p1", { uniform_price: true, variants: [{ color_name: "Noir", color_hex: "#000000", stock: 1, price: 5 }] });
    const insert = d1.current!.batchStatements().find((s) => /insert into "product_variants"/i.test(s.sql))!;
    expect(insert.params).toEqual(expect.arrayContaining([100000, 120000]));
    expect(insert.params).not.toContain(5);
  });

  it("refuse un produit publié", async () => {
    await expect(setColorVariants("p1", { uniform_price: true, variants: [] })).rejects.toMatchObject({ code: "not_found" });
  });
});
