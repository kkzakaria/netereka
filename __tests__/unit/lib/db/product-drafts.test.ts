import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => {
  // createD1Mock is imported above but hoisting needs a lazy reference.
  return { current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> };
});
const mocks = vi.hoisted(() => ({ deleteFromR2: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: mocks.deleteFromR2, uploadToR2: vi.fn() }));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: vi.fn() }));

import {
  attributesToRows,
  createDraft,
  updateDraft,
  getDraft,
  searchProducts,
  deleteDraft,
  DraftError,
} from "@/lib/db/product-drafts";

beforeEach(() => {
  d1.current = createD1Mock();
  mocks.deleteFromR2.mockReset().mockResolvedValue(undefined);
});

const sqlOf = (s: BoundStatement) => s.sql.replace(/\s+/g, " ");

describe("attributesToRows", () => {
  it("encode couleurs, dimensions et specs avec les conventions du wizard", () => {
    expect(attributesToRows({
      colors: [{ name: "Noir", hex: "#000000" }],
      dimensions: { length_mm: 160, weight_g: 190 },
      specs: [{ name: "Écran", value: "6.1\"" }],
    })).toEqual([
      { name: "Couleur", value: "Noir|#000000" },
      { name: "Longueur", value: "160" },
      { name: "Poids", value: "190" },
      { name: "Écran", value: "6.1\"" },
    ]);
  });

  it("retourne [] sans attributs", () => {
    expect(attributesToRows(undefined)).toEqual([]);
  });
});

describe("createDraft", () => {
  it("refuse une catégorie inconnue", async () => {
    await expect(createDraft({ name: "Galaxy A55", category_id: "nope" }))
      .rejects.toMatchObject({ code: "not_found" });
  });

  it("insère un brouillon inactif avec un slug dérivé du nom, en un seul batch", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "categories"/i.test(stmt.sql) ? [["cat-1"]] : []);

    const r = await createDraft({
      name: "Galaxy A55",
      category_id: "cat-1",
      description_html: "<p>Hi</p><script>x()</script>",
      attributes: { colors: [{ name: "Noir", hex: "#000000" }], dimensions: {}, specs: [] },
      pricing: { base_price: 150000, sku: "GA55" },
    });

    expect(r.slug).toBe("galaxy-a55");
    const stmts = d1.current!.batchStatements();
    const insert = stmts.find((s) => /insert into "products"/i.test(s.sql))!;
    expect(insert.params).toContain("galaxy-a55");
    const strings = insert.params.filter((p): p is string => typeof p === "string");
    expect(strings.some((s) => s.includes("<p>Hi</p>"))).toBe(true);   // sanitized HTML kept
    expect(strings.some((s) => s.includes("<script>"))).toBe(false);   // script stripped
    expect(stmts.filter((s) => /insert into "product_attributes"/i.test(s.sql))).toHaveLength(1);
    // is_draft = 1, is_active = 0 are bound values of the products insert
    expect(insert.params).toEqual(expect.arrayContaining([1, 0]));
  });

  it("suffixe le slug quand il est pris", async () => {
    const taken = new Set(["galaxy-a55", "galaxy-a55-2"]);
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/from "categories"/i.test(stmt.sql)) return [["cat-1"]];
      if (/from "products"/i.test(stmt.sql) && /"slug" =/i.test(stmt.sql)) {
        return taken.has(stmt.params[0] as string) ? [["other"]] : [];
      }
      return [];
    });
    const r = await createDraft({ name: "Galaxy A55", category_id: "cat-1" });
    expect(r.slug).toBe("galaxy-a55-3");
  });

  it("refuse un SKU déjà utilisé", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/from "categories"/i.test(stmt.sql)) return [["cat-1"]];
      if (/"sku" =/i.test(stmt.sql)) return [["p-other"]];
      return [];
    });
    await expect(createDraft({ name: "X", category_id: "cat-1", pricing: { sku: "DUP" } }))
      .rejects.toMatchObject({ code: "conflict" });
  });
});

describe("updateDraft", () => {
  it("refuse un produit qui n'est pas un brouillon", async () => {
    await expect(updateDraft("p1", { name: "Y" })).rejects.toMatchObject({ code: "not_found" });
    const probe = d1.current!.boundMatching(/from "products"/i)[0];
    expect(sqlOf(probe)).toMatch(/"is_draft" = \?/);
    expect(probe.params).toContain(1);
  });

  it("met à jour uniquement les champs fournis et remplace les attributs quand présents", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["p1", "old-slug"]] : []);

    const r = await updateDraft("p1", {
      brand: null,
      attributes: { colors: [], dimensions: {}, specs: [{ name: "RAM", value: "8 Go" }] },
    });

    expect(r).toEqual({ id: "p1", slug: "old-slug" });
    const stmts = d1.current!.batchStatements();
    const update = stmts.find((s) => /update "products"/i.test(s.sql))!;
    expect(sqlOf(update)).toMatch(/"brand" = \?/);
    expect(sqlOf(update)).not.toMatch(/"name" = \?/);
    expect(sqlOf(update)).toMatch(/where .*"is_draft" = \?/i);
    expect(stmts.some((s) => /delete from "product_attributes"/i.test(s.sql))).toBe(true);
    expect(stmts.filter((s) => /insert into "product_attributes"/i.test(s.sql))).toHaveLength(1);
  });

  it("refuse un slug explicite déjà pris", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return [["p1", "old-slug"]];
      if (/"slug" = \?/i.test(stmt.sql)) return [["p2"]];
      return [];
    });
    await expect(updateDraft("p1", { slug: "taken" })).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("getDraft", () => {
  it("lève not_found si le brouillon n'existe pas", async () => {
    await expect(getDraft("p1")).rejects.toBeInstanceOf(DraftError);
  });
});

describe("searchProducts", () => {
  it("cherche sur nom, slug et SKU avec la limite", async () => {
    await searchProducts("galaxy", 5);
    const stmt = d1.current!.boundMatching(/from "products"/i)[0];
    expect(sqlOf(stmt)).toMatch(/"name" like \?/i);
    expect(sqlOf(stmt)).toMatch(/"slug" like \?/i);
    expect(sqlOf(stmt)).toMatch(/"sku" like \?/i);
    expect(stmt.params).toContain("%galaxy%");
    expect(stmt.params).toContain(5);
  });

  it("échappe % et _ dans la requête", async () => {
    await searchProducts("100%_x", 5);
    const stmt = d1.current!.boundMatching(/from "products"/i)[0];
    expect(stmt.params).toContain("%100\\%\\_x%");
  });
});

describe("deleteDraft", () => {
  it("supprime enfants puis produit, puis les objets R2, uniquement pour un brouillon", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return [["p1", "slug"]];
      if (/from "product_images"/i.test(stmt.sql)) return [["products/p1/a.jpg"], ["/images/legacy.jpg"]];
      return [];
    });
    await deleteDraft("p1");
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts[stmts.length - 1]).toMatch(/delete from "products" where .*"is_draft" = \?/i);
    expect(stmts.some((s) => /delete from "product_images"/i.test(s))).toBe(true);
    expect(stmts.some((s) => /delete from "product_variants"/i.test(s))).toBe(true);
    expect(stmts.some((s) => /delete from "product_attributes"/i.test(s))).toBe(true);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("legacy.jpg");
  });
});
