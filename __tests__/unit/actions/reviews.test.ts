import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  canUserReview: vi.fn(),
  createReview: vi.fn(),
  queryFirst: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT: ${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db/reviews", () => ({
  canUserReview: mocks.canUserReview,
  createReview: mocks.createReview,
}));
vi.mock("@/lib/db", () => ({ queryFirst: mocks.queryFirst }));

import { submitReview } from "@/actions/reviews";

describe("submitReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.canUserReview.mockResolvedValue(true);
    mocks.createReview.mockResolvedValue(undefined);
    mocks.queryFirst.mockResolvedValue({ slug: "iphone-15" });
  });

  it("crée un avis avec des données valides", async () => {
    const result = await submitReview({ productId: "prod-1", rating: 5, comment: "Excellent" });
    expect(result.success).toBe(true);
    expect(mocks.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "prod-1", rating: 5, comment: "Excellent" })
    );
  });

  it("rejette les données invalides", async () => {
    const result = await submitReview({ productId: "", rating: 0 });
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("rejette si l'utilisateur n'a pas acheté le produit", async () => {
    mocks.canUserReview.mockResolvedValue(false);
    const result = await submitReview({ productId: "prod-1", rating: 4 });
    expect(result.success).toBe(false);
    expect(result.error).toContain("acheté");
  });

  it("redirige si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(submitReview({ productId: "prod-1", rating: 5 })).rejects.toThrow("NEXT_REDIRECT");
  });

  it("gère un commentaire absent (optionnel)", async () => {
    const result = await submitReview({ productId: "prod-1", rating: 3 });
    expect(result.success).toBe(true);
    expect(mocks.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null })
    );
  });
});
