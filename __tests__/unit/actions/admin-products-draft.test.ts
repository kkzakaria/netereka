// __tests__/unit/actions/admin-products-draft.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & {
      digest: string;
    };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  queryFirst: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi
    .fn()
    .mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  execute: mocks.execute,
}));

import { saveDraftStep } from "@/actions/admin/products";

const DRAFT_PRODUCT = { slug: "draft-abc123" };

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("saveDraftStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst.mockResolvedValue(DRAFT_PRODUCT);
    mocks.execute.mockResolvedValue(undefined);
  });

  // ── Auth & ID guards ──────────────────────────────────────────────────────

  it("rejette un id vide", async () => {
    const result = await saveDraftStep("", makeFormData({ _step: "1" }));
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("retourne une erreur si le produit est introuvable ou non-brouillon", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "1", name: "Test", category_id: "cat-1" }),
    );
    expect(result).toEqual({ success: false, error: "Produit introuvable" });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  // ── Étape invalide ────────────────────────────────────────────────────────

  it("retourne une erreur pour une étape invalide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "99" }),
    );
    expect(result).toEqual({ success: false, error: "Étape invalide" });
  });

  // ── Étape 1 : Identité ────────────────────────────────────────────────────

  it("étape 1 : réussit avec nom et catégorie valides", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55",
        category_id: "cat-1",
        brand: "Samsung",
        sku: "SGX-A55",
      }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).toContain("UPDATE products SET");
    expect(sql).toContain("WHERE id = ? AND is_draft = 1");
    expect(sql).not.toContain("is_draft = 0");
  });

  it("étape 1 : rejette si nom vide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "1", name: "", category_id: "cat-1" }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("nom");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 1 : rejette si category_id vide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "1", name: "Test", category_id: "" }),
    );
    expect(result.success).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 1 : auto-dérive le slug depuis name si slug actuel commence par draft-", async () => {
    mocks.queryFirst
      .mockResolvedValueOnce(DRAFT_PRODUCT)
      .mockResolvedValueOnce(null);
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55",
        category_id: "cat-1",
      }),
    );
    expect(result).toEqual({ success: true });
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).toContain("slug = ?");
  });

  it("étape 1 : retourne erreur si slug collide avec un autre produit", async () => {
    mocks.queryFirst
      .mockResolvedValueOnce(DRAFT_PRODUCT)
      .mockResolvedValueOnce({ id: "other-product" });
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55",
        category_id: "cat-1",
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("slug");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 1 : ne dérive pas le slug si le slug actuel n'est pas un draft-slug", async () => {
    mocks.queryFirst.mockResolvedValueOnce({ slug: "samsung-galaxy-a55" });
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55 modifié",
        category_id: "cat-1",
      }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.queryFirst).toHaveBeenCalledOnce();
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).not.toContain("slug = ?");
  });

  // ── Étape 2 : Prix & Stock ────────────────────────────────────────────────

  it("étape 2 : réussit avec un prix valide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "2", base_price: "125000" }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("étape 2 : rejette un prix négatif", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "2", base_price: "-1" }),
    );
    expect(result.success).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 2 : rejette un prix non-entier", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "2", base_price: "125.50" }),
    );
    expect(result.success).toBe(false);
  });

  // ── Étape 3 : Médias (no-op) ──────────────────────────────────────────────

  it("étape 3 : réussit sans appel DB (aucun champ à sauvegarder)", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "3" }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  // ── Étape 4 : Finalisation ────────────────────────────────────────────────

  it("étape 4 : réussit avec des champs valides", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "4",
        short_description: "Un super téléphone",
        meta_title: "Samsung Galaxy A55 | Netereka",
        meta_description: "Achetez le Samsung Galaxy A55",
        is_active: "0",
        is_featured: "0",
      }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("étape 4 : rejette meta_title > 60 caractères", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "4", meta_title: "a".repeat(61) }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("60");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 4 : rejette meta_description > 160 caractères", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "4", meta_description: "a".repeat(161) }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("160");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 4 : ne touche pas is_draft dans le SQL", async () => {
    await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "4", is_active: "1", is_featured: "0" }),
    );
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).not.toContain("is_draft");
  });
});
