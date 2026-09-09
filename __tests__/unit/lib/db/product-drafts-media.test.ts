import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => ({
  current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock>,
}));
const mocks = vi.hoisted(() => ({ deleteFromR2: vi.fn(), fetchAndUploadImage: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: mocks.deleteFromR2, uploadToR2: vi.fn() }));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: mocks.fetchAndUploadImage }));

import { addImagesFromUrls, removeImage, setColorVariants, type DraftAudit } from "@/lib/db/product-drafts";

const sqlOf = (s: BoundStatement) => s.sql.replace(/\s+/g, " ");
const DRAFT_ROW = [["p1", "slug"]];
const AUDIT: DraftAudit = { actor: { id: "admin-1", name: "Admin" }, details: { via: "mcp", tool: "t", client_id: "c1" } };
const isImageInsert = (s: BoundStatement) => /insert into "product_images"/i.test(s.sql);
const isAuditInsert = (s: BoundStatement) => /insert into "audit_log"/i.test(s.sql);
const isCount = (sql: string) => /count\(\*\)/i.test(sql) && /from "product_images"/i.test(sql);
const isReadBack = (sql: string) => /select "id", "is_primary" from "product_images"/i.test(sql);

beforeEach(() => {
  d1.current = createD1Mock();
  mocks.deleteFromR2.mockReset().mockResolvedValue(undefined);
  mocks.fetchAndUploadImage.mockReset().mockImplementation(async (_id: string, url: string) =>
    ({ ok: true, key: `products/p1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));
});

/**
 * Simulates the transactional batch: every image INSERT whose guard passes
 * lands, and the read-back after the batch reports the rows in the table.
 * `existing` = rows already there as [id, is_primary].
 */
function simulateImagesTable(existing: Array<[string, number]>, capacityLeft = 12 - existing.length) {
  const rows: Array<[string, number]> = [...existing];
  d1.current!.raw.mockImplementation(async (stmt) => {
    if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
    if (isCount(stmt.sql)) return [[existing.length]];
    if (isReadBack(stmt.sql)) return rows;
    return [];
  });
  d1.current!.batch.mockImplementation(async (stmts) => {
    let left = capacityLeft;
    for (const st of stmts.filter(isImageInsert)) {
      if (left <= 0) continue;
      left--;
      const hasPrimary = rows.some((r) => r[1] === 1);
      rows.push([st.params[0] as string, hasPrimary ? 0 : 1]);
    }
    return [];
  });
  return rows;
}

describe("addImagesFromUrls", () => {
  it("refuse au-delà de 12 images au total, avant tout téléchargement", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (isCount(stmt.sql)) return [[11]];
      return [];
    });
    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }], AUDIT))
      .rejects.toMatchObject({ code: "limit_exceeded" });
    expect(mocks.fetchAndUploadImage).not.toHaveBeenCalled();
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("insère les images réussies, marque la première primaire, rapporte les échecs", async () => {
    simulateImagesTable([]);
    mocks.fetchAndUploadImage.mockImplementation(async (_id: string, url: string) =>
      url.endsWith("bad.jpg") ? { ok: false, reason: "bad_status", status: 404 }
        : { ok: true, key: `products/p1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 1 });

    const r = await addImagesFromUrls("p1", [{ url: "https://x/bad.jpg" }, { url: "https://x/a.jpg", alt: "A" }, { url: "https://x/b.jpg" }], AUDIT);

    expect(r.results).toEqual([
      { url: "https://x/bad.jpg", ok: false, reason: "bad_status" },
      { url: "https://x/a.jpg", ok: true, image_id: expect.any(String) },
      { url: "https://x/b.jpg", ok: true, image_id: expect.any(String) },
    ]);
    expect(r.primary_image_id).toBe(r.results[1].image_id);
    const inserts = d1.current!.batchStatements().filter(isImageInsert);
    expect(inserts).toHaveLength(2);
    expect(inserts[0].params).toEqual(expect.arrayContaining(["products/p1/a.jpg", "A"]));
    expect(inserts[1].params).toEqual(expect.arrayContaining(["products/p1/b.jpg", null]));
  });

  it("décide is_primary, sort_order et la limite dans l'INSERT lui-même (atomique avec le batch)", async () => {
    simulateImagesTable([["img-0", 1]]);
    await addImagesFromUrls("p1", [{ url: "https://x/c.jpg" }], AUDIT);
    const stmt = d1.current!.batchStatements().find(isImageInsert)!;
    const insert = sqlOf(stmt);
    expect(insert).toMatch(/^insert into "product_images" \("id", "product_id", "variant_id", "url", "alt", "sort_order", "is_primary", "created_at"\) select /i);
    // next free sort_order
    expect(insert).toMatch(/coalesce\(\(select max\("sort_order"\) \+ 1 from "product_images" where "product_images"\."product_id" = \?\), 0\) as "sort_order"/i);
    // primary only when the product has none yet
    expect(insert).toMatch(/case when exists \(select 1 from "product_images" where "product_images"\."product_id" = \? and "is_primary" = 1\) then 0 else 1 end as "is_primary"/i);
    // sourced from the draft's own row, so is_draft = 1 and the per-product cap are re-checked at commit time
    expect(insert).toMatch(/from "products" where \("products"\."id" = \? and "products"\."is_draft" = \? and \(select count\(\*\) from "product_images" where "product_images"\."product_id" = \?\) < \?\)$/i);
    // The only numeric params are is_draft = 1 and the cap: no JS-side sort_order / is_primary literal is bound anymore
    expect(stmt.params.filter((p) => typeof p === "number")).toEqual([1, 12]);
  });

  it("garde la primaire existante (lue après le batch)", async () => {
    simulateImagesTable([["img-0", 1], ["img-1", 0]]);
    const r = await addImagesFromUrls("p1", [{ url: "https://x/c.jpg" }], AUDIT);
    expect(r.primary_image_id).toBe("img-0");
    expect(r.results[0].ok).toBe(true);
  });

  it("rapporte limit_exceeded et nettoie R2 pour les images qu'un appel concurrent a évincées", async () => {
    // Pre-check sees 10 images (room for 2), but by the time the batch runs only one slot is left.
    simulateImagesTable(Array.from({ length: 10 }, (_, i): [string, number] => [`img-${i}`, i === 0 ? 1 : 0]), 1);

    const r = await addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }], AUDIT);

    expect(r.results[0]).toEqual({ url: "https://x/a.jpg", ok: true, image_id: expect.any(String) });
    expect(r.results[1]).toEqual({ url: "https://x/b.jpg", ok: false, reason: "limit_exceeded" });
    expect(r.primary_image_id).toBe("img-0");
    expect(mocks.deleteFromR2).toHaveBeenCalledTimes(1);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/b.jpg");
  });

  it("commet l'audit dans le même batch, conditionné à au moins une image réellement insérée", async () => {
    simulateImagesTable([]);
    const r = await addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }], AUDIT);
    const stmts = d1.current!.batchStatements();
    const audit = stmts.find(isAuditInsert)!;
    expect(stmts.indexOf(audit)).toBe(stmts.length - 1);
    expect(sqlOf(audit)).toMatch(/^insert into "audit_log" \("id", "actor_id", "actor_name", "action", "target_type", "target_id", "details", "created_at"\) select /i);
    expect(sqlOf(audit)).toMatch(/from "products" where \("products"\."id" = \? and exists \(select 1 from "product_images" where "product_images"\."id" in \(\?\)\)\)$/i);
    expect(audit.params).toEqual(expect.arrayContaining([
      "admin-1", "Admin", "product.draft_updated", "product", "p1", JSON.stringify(AUDIT.details), r.results[0].image_id,
    ]));
  });

  it("n'écrit ni image ni audit quand aucun téléchargement n'a réussi", async () => {
    simulateImagesTable([]);
    mocks.fetchAndUploadImage.mockResolvedValue({ ok: false, reason: "too_large" });
    const r = await addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }], AUDIT);
    expect(r.results[0]).toEqual({ url: "https://x/a.jpg", ok: false, reason: "too_large" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("nettoie R2 si le batch échoue", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    d1.current!.batch.mockRejectedValue(new Error("D1 down"));
    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }], AUDIT)).rejects.toThrow("D1 down");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
  });

  it("journalise les échecs de nettoyage R2 après un batch en échec", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    d1.current!.batch.mockRejectedValue(new Error("D1 down"));
    mocks.deleteFromR2.mockImplementation(async (key: string) => {
      if (key === "products/p1/a.jpg") throw new Error("R2 unreachable");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }], AUDIT))
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
    await removeImage("p1", "img-0", AUDIT);
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts[0]).toMatch(/delete from "product_images"/i);
    expect(stmts[1]).toMatch(/update "product_images" set "is_primary" = \?/i);
    expect(stmts[2]).toMatch(/insert into "audit_log"/i);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
  });

  it("lève not_found pour une image d'un autre produit", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    await expect(removeImage("p1", "img-x", AUDIT)).rejects.toMatchObject({ code: "not_found" });
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
    }, AUDIT);

    expect(r.stock_quantity).toBe(5);
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts.some((s) => /update "product_variants" set/i.test(s))).toBe(true);        // Noir
    expect(stmts.some((s) => /insert into "product_variants"/i.test(s))).toBe(true);      // Rouge
    expect(stmts.some((s) => /update "product_images" set "variant_id" = \?/i.test(s))).toBe(true); // Bleu images detached
    expect(stmts.some((s) => /delete from "product_variants" where "product_variants"."id" = \?/i.test(s))).toBe(true); // Bleu
    expect(stmts[stmts.length - 2]).toMatch(/update "products" set "stock_quantity" = \?.*"is_draft" = \?/i);
    expect(stmts[stmts.length - 1]).toMatch(/insert into "audit_log"/i);
    const rougeInsert = d1.current!.batchStatements().find((s) => /insert into "product_variants"/i.test(s.sql))!;
    expect(rougeInsert.params).toEqual(expect.arrayContaining(["Rouge", 100000, JSON.stringify({ color: "Rouge:#ff0000" })])); // price → base_price
  });

  it("applique le prix de base à toutes les variantes en uniform_price", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/from "products"/i.test(stmt.sql) ? PRODUCT_ROW : []));
    await setColorVariants("p1", { uniform_price: true, variants: [{ color_name: "Noir", color_hex: "#000000", stock: 1, price: 5 }] }, AUDIT);
    const insert = d1.current!.batchStatements().find((s) => /insert into "product_variants"/i.test(s.sql))!;
    expect(insert.params).toEqual(expect.arrayContaining([100000, 120000]));
    expect(insert.params).not.toContain(5);
  });

  it("refuse un produit publié", async () => {
    await expect(setColorVariants("p1", { uniform_price: true, variants: [] }, AUDIT)).rejects.toMatchObject({ code: "not_found" });
  });
});
