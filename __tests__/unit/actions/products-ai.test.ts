import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";

/**
 * The action builds its queries with Drizzle (`getDrizzle()`), so this suite mocks the
 * D1 binding one level lower — `getDB()` — and lets the real Drizzle driver compile the
 * statements. Assertions therefore run against the SQL/params Drizzle actually emits,
 * which is what catches a column/type drift between `lib/db/schema.ts` and the action.
 */

interface BoundStatement { sql: string; params: unknown[] }

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const err = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;${url}`;
    throw err;
  }),
  /** Every prepare().bind() the driver issues, in order. */
  bound: vi.fn(),
  /** Single-statement execution (INSERT draft, compensating DELETE). */
  run: vi.fn(),
  /** Row-array reads backing `.get()` — return `[]` for "no row". */
  raw: vi.fn(),
  dbBatch: vi.fn(),
  fetchAndUploadImage: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => ({
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => {
        const stmt = { sql, params };
        mocks.bound(stmt);
        return {
          ...stmt,
          run: () => mocks.run(stmt),
          all: () => mocks.raw(stmt).then((rows: unknown[][]) => ({ results: rows })),
          raw: () => mocks.raw(stmt),
        };
      },
    }),
    batch: (stmts: unknown[]) => mocks.dbBatch(stmts),
  }),
}));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: mocks.fetchAndUploadImage }));
vi.mock("@/lib/storage/images", () => ({
  deleteFromR2: vi.fn().mockResolvedValue(undefined),
  uploadToR2: vi.fn().mockResolvedValue(undefined),
}));

import { importCandidateImages } from "@/actions/admin/products-ai";

import type { AiProductOutput } from "@/lib/validations/product-ai";

const OUTPUT: AiProductOutput = {
  name: "Galaxy A55",
  brand: "Samsung",
  category_suggestion: "smartphones",
  description_html: "<p>Hi</p>",
  short_description: "short",
  attributes: {
    colors: [{ name: "Noir", hex: "#111111" }],
    dimensions: { length_mm: 160 },
    specs: [{ name: "Écran", value: '6.6" AMOLED' }],
  },
  story: {
    tagline: "tag",
    highlights: [
      { icon: "camera", label: "l1" },
      { icon: "battery", label: "l2" },
      { icon: "display", label: "l3" },
    ],
    feature_blocks: [
      { title: "t1", body: "b1" },
      { title: "t2", body: "b2" },
    ],
    faq: [{ question: "q", answer: "a" }],
  },
  seo: { meta_title: "Galaxy A55", meta_description: "d" },
  image_candidates: [
    { url: "https://x.test/a.jpg", source_domain: "x.test" },
    { url: "https://x.test/b.jpg", source_domain: "x.test" },
  ],
};

/** Statements handed to `db.batch()` on the Nth call. */
function batchStatements(call = 0): BoundStatement[] {
  return mocks.dbBatch.mock.calls[call][0] as BoundStatement[];
}

function statementsMatching(pattern: RegExp, call = 0): BoundStatement[] {
  return batchStatements(call).filter((s) => pattern.test(s.sql));
}

describe("importCandidateImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.run.mockResolvedValue({ success: true, meta: { changes: 1 }, results: [] });
    // No category matches and no slug is taken, unless a test overrides it.
    mocks.raw.mockResolvedValue([]);
    mocks.dbBatch.mockResolvedValue([]);
    mocks.fetchAndUploadImage.mockImplementation(async (_: string, url: string) =>
      ({ ok: true, key: `products/d1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));
  });

  it("refuse un admin non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(importCandidateImages(OUTPUT, ["https://x.test/a.jpg"])).rejects.toThrow("NEXT_REDIRECT");
  });

  it("refuse une URL hors image_candidates", async () => {
    const r = await importCandidateImages(OUTPUT, ["https://evil.test/x.jpg"]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/invalide/i);
  });

  it("crée le draft + applique les champs + télécharge les images (happy path)", async () => {
    const r = await importCandidateImages(OUTPUT, [
      "https://x.test/a.jpg",
      "https://x.test/b.jpg",
    ]);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.id).toBeTruthy();
      expect(r.warnings).toEqual([]);
    }
    expect(mocks.fetchAndUploadImage).toHaveBeenCalledTimes(2);
    expect(mocks.dbBatch).toHaveBeenCalled();

    // The draft row is inserted on its own, before the batch.
    const draftInsert = mocks.run.mock.calls
      .map((call) => call[0] as BoundStatement)
      .filter((s) => /insert into "products"/i.test(s.sql));
    expect(draftInsert).toHaveLength(1);
    expect(draftInsert[0].params).toContain(r.id);

    // The batch leads with the UPDATE on the draft, then the attribute/image inserts.
    const stmts = batchStatements();
    expect(stmts[0].sql).toMatch(/^update "products" set/i);
    // 1 colour + 1 dimension (length_mm) + 1 spec
    expect(statementsMatching(/insert into "product_attributes"/i)).toHaveLength(3);
    expect(statementsMatching(/insert into "product_images"/i)).toHaveLength(2);
  });

  it("résout la catégorie suggérée et la rattache au brouillon", async () => {
    // First `.get()` is the category lookup; the following ones are slug-uniqueness probes.
    mocks.raw.mockImplementation(async (stmt: BoundStatement) =>
      /from "categories"/i.test(stmt.sql) ? [["cat-smartphones"]] : []);

    const r = await importCandidateImages(OUTPUT, ["https://x.test/a.jpg"]);
    expect(r.success).toBe(true);

    const categoryLookup = mocks.bound.mock.calls
      .map((call) => call[0] as BoundStatement)
      .find((s) => /from "categories"/i.test(s.sql));
    expect(categoryLookup).toBeDefined();
    expect(categoryLookup!.sql).toMatch(/lower\("categories"\."slug"\) = lower\(\?\)/i);
    expect(categoryLookup!.params).toEqual(["smartphones", 1]); // slug + limit

    // The resolved category id is carried by the batch UPDATE.
    expect(batchStatements()[0].params).toContain("cat-smartphones");
  });

  it("suffixe le slug tant qu'il est déjà pris", async () => {
    const takenSlugs = new Set(["galaxy-a55", "galaxy-a55-2"]);
    mocks.raw.mockImplementation(async (stmt: BoundStatement) => {
      if (!/from "products"/i.test(stmt.sql)) return [];
      return takenSlugs.has(stmt.params[0] as string) ? [["other-product"]] : [];
    });

    const r = await importCandidateImages(OUTPUT, ["https://x.test/a.jpg"]);
    expect(r.success).toBe(true);
    expect(batchStatements()[0].params).toContain("galaxy-a55-3");
  });

  it("garde le slug placeholder si les 20 candidats sont pris", async () => {
    mocks.raw.mockImplementation(async (stmt: BoundStatement) =>
      /from "products"/i.test(stmt.sql) ? [["other-product"]] : []);

    const r = await importCandidateImages(OUTPUT, ["https://x.test/a.jpg"]);
    expect(r.success).toBe(true);
    expect(batchStatements()[0].params).toContain(`draft-${r.id}`);
  });

  it("renvoie warnings pour les images échouées mais crée quand même le draft", async () => {
    mocks.fetchAndUploadImage.mockImplementationOnce(async () => ({ ok: false, reason: "too_large" }));
    mocks.fetchAndUploadImage.mockImplementationOnce(async (_: string, url: string) =>
      ({ ok: true, key: `products/d1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));

    const r = await importCandidateImages(OUTPUT, [
      "https://x.test/a.jpg",
      "https://x.test/b.jpg",
    ]);
    expect(r.success).toBe(true);
    if (r.success) expect(r.warnings).toEqual(["https://x.test/a.jpg"]);
  });

  it("écrit la clé R2 brute (sans prefixe /images/) et propage alt", async () => {
    const outputWithAlt = {
      ...OUTPUT,
      image_candidates: [
        { url: "https://x.test/a.jpg", source_domain: "x.test", alt: "Face avant" },
        { url: "https://x.test/b.jpg", source_domain: "x.test", alt: "Profil" },
      ],
    };
    mocks.fetchAndUploadImage.mockImplementation(async (_: string, url: string) => ({
      ok: true,
      key: `products/d1/${url.split("/").pop()}`,
      contentType: "image/jpeg",
      size: 10,
    }));

    const r = await importCandidateImages(outputWithAlt, [
      "https://x.test/a.jpg",
      "https://x.test/b.jpg",
    ]);
    expect(r.success).toBe(true);

    const imageInserts = statementsMatching(/insert into "product_images"/i);
    expect(imageInserts).toHaveLength(2); // one statement per image row
    // url = bare R2 key, no "/images/" prefix — plus the alt text and the primary/order flags.
    expect(imageInserts[0].params).toContain("products/d1/a.jpg");
    expect(imageInserts[0].params).toContain("Face avant");
    expect(imageInserts[1].params).toContain("products/d1/b.jpg");
    expect(imageInserts[1].params).toContain("Profil");
  });

  it("nettoie les images R2 orphelines si le batch échoue", async () => {
    const { deleteFromR2: deleteFromR2Mock } = await import("@/lib/storage/images");
    mocks.dbBatch.mockRejectedValueOnce(new Error("batch failed"));
    mocks.fetchAndUploadImage.mockImplementation(async (_: string, url: string) => ({
      ok: true,
      key: `products/d1/${url.split("/").pop()}`,
      contentType: "image/jpeg",
      size: 10,
    }));

    const r = await importCandidateImages(OUTPUT, [
      "https://x.test/a.jpg",
      "https://x.test/b.jpg",
    ]);
    expect(r.success).toBe(false);
    expect(deleteFromR2Mock).toHaveBeenCalledTimes(2);
  });

  it("supprime la ligne draft orpheline si le batch échoue", async () => {
    mocks.dbBatch.mockRejectedValueOnce(new Error("batch failed"));
    mocks.fetchAndUploadImage.mockImplementation(async (_: string, url: string) => ({
      ok: true,
      key: `products/d1/${url.split("/").pop()}`,
      contentType: "image/jpeg",
      size: 10,
    }));

    const r = await importCandidateImages(OUTPUT, ["https://x.test/a.jpg"]);
    expect(r.success).toBe(false);

    // The compensating DELETE should have been issued with the draft id.
    const deletes = mocks.run.mock.calls
      .map((call) => call[0] as BoundStatement)
      .filter((s) => /^delete from "products"/i.test(s.sql));
    expect(deletes).toHaveLength(1);
    // The draft id is the one passed to fetchAndUploadImage as the first arg.
    const fetchCall = mocks.fetchAndUploadImage.mock.calls[0] as [string, string];
    expect(deletes[0].params).toEqual([fetchCall[0]]);
  });

  it("échoue proprement si l'insertion du brouillon casse", async () => {
    mocks.run.mockRejectedValueOnce(new Error("insert failed"));
    const r = await importCandidateImages(OUTPUT, ["https://x.test/a.jpg"]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/brouillon/i);
    expect(mocks.dbBatch).not.toHaveBeenCalled();
    expect(mocks.fetchAndUploadImage).not.toHaveBeenCalled();
  });
});
