import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  queryFirst: vi.fn(),
  atomicToggleWishlist: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db", () => ({ queryFirst: mocks.queryFirst }));
vi.mock("@/lib/db/wishlist", () => ({ atomicToggleWishlist: mocks.atomicToggleWishlist }));

import { toggleWishlist } from "@/actions/wishlist";

describe("toggleWishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.queryFirst.mockResolvedValue({ id: "prod-1" });
    mocks.atomicToggleWishlist.mockResolvedValue(true);
  });

  it("ajoute un produit à la wishlist", async () => {
    const result = await toggleWishlist("prod-1");
    expect(result).toEqual({ success: true, added: true });
  });

  it("retire un produit de la wishlist", async () => {
    mocks.atomicToggleWishlist.mockResolvedValue(false);
    const result = await toggleWishlist("prod-1");
    expect(result).toEqual({ success: true, added: false });
  });

  it("rejette un productId vide", async () => {
    const result = await toggleWishlist("");
    expect(result.success).toBe(false);
  });

  it("rejette si le produit n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await toggleWishlist("prod-inexistant");
    expect(result.success).toBe(false);
  });

  it("gère l'erreur de la DB", async () => {
    mocks.atomicToggleWishlist.mockRejectedValue(new Error("DB error"));
    const result = await toggleWishlist("prod-1");
    expect(result.success).toBe(false);
  });

  it("redirige si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(toggleWishlist("prod-1")).rejects.toThrow("NEXT_REDIRECT");
  });
});
