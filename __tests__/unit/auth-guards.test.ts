import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession, mockAdminSession, mockSuperAdminSession } from "../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));

import { requireAuth, requireAdmin, requireGuest, getOptionalSession } from "@/lib/auth/guards";

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la session si authentifié", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    const session = await requireAuth();
    expect(session).toEqual(mockCustomerSession);
  });

  it("redirige vers /auth/sign-in si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in");
  });
});

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la session pour un admin", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    const session = await requireAdmin();
    expect(session.user.role).toBe("admin");
  });

  it("retourne la session pour un super_admin", async () => {
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    const session = await requireAdmin();
    expect(session.user.role).toBe("super_admin");
  });

  it("redirige vers / pour un customer", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirige vers /auth/sign-in si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in");
  });
});

describe("requireGuest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ne redirige pas si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireGuest()).resolves.toBeUndefined();
  });

  it("redirige vers / si authentifié", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(requireGuest()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});

describe("getOptionalSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la session si authentifié", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    const session = await getOptionalSession();
    expect(session).toEqual(mockCustomerSession);
  });

  it("retourne null si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    const session = await getOptionalSession();
    expect(session).toBeNull();
  });
});
