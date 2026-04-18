import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const err = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;${url}`;
    throw err;
  }),
  execute: vi.fn(),
  queryFirst: vi.fn(),
  query: vi.fn(),
  fetchAndUploadImage: vi.fn(),
  revalidatePath: vi.fn(),
  dbBatch: vi.fn(),
  prepare: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/db", () => ({
  execute: mocks.execute,
  queryFirst: mocks.queryFirst,
  query: mocks.query,
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => ({
    prepare: (sql: string) => { mocks.prepare(sql); return { bind: (..._args: unknown[]) => ({ sql, args: _args }) }; },
    batch: (stmts: unknown[]) => mocks.dbBatch(stmts),
  }),
}));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: mocks.fetchAndUploadImage }));

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

describe("importCandidateImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.queryFirst.mockResolvedValue(null);
    mocks.query.mockResolvedValue([]);
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
});
