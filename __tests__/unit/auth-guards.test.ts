import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockCustomerSession,
  mockAdminSession,
  mockSuperAdminSession,
  mockAgentSession,
  mockBannedAdminSession,
  mockExpiredBanAdminSession,
  mockBannedCustomerSession,
  mockExpiredBanCustomerSession,
} from "../helpers/mocks";

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

import { requireAuth, requireAdmin, requireAnyAdmin, requireSuperAdmin, requireGuest, getOptionalSession } from "@/lib/auth/guards";

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

  it("redirige vers / pour un client activement banni", async () => {
    mocks.getSession.mockResolvedValue(mockBannedCustomerSession);
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("ne bloque pas un client dont le bannissement a expiré", async () => {
    mocks.getSession.mockResolvedValue(mockExpiredBanCustomerSession);
    const session = await requireAuth();
    expect(session).toEqual(mockExpiredBanCustomerSession);
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

  it("redirige vers / pour un agent", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
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

describe("requireAnyAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la session pour un agent", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);
    const session = await requireAnyAdmin();
    expect(session.user.role).toBe("agent");
  });

  it("retourne la session pour un admin", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    const session = await requireAnyAdmin();
    expect(session.user.role).toBe("admin");
  });

  it("retourne la session pour un super_admin", async () => {
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    const session = await requireAnyAdmin();
    expect(session.user.role).toBe("super_admin");
  });

  it("redirige vers / pour un customer", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(requireAnyAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirige vers /auth/sign-in si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireAnyAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in");
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la session pour un super_admin", async () => {
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    const session = await requireSuperAdmin();
    expect(session.user.role).toBe("super_admin");
  });

  it("redirige vers / pour un admin", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirige vers / pour un agent", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirige vers / pour un customer", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirige vers /auth/sign-in si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in");
  });
});

describe("privileged guards bypass the session cookie cache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requireAdmin reads session state fresh", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);

    await requireAdmin();

    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    );
  });

  it("requireSuperAdmin reads session state fresh", async () => {
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);

    await requireSuperAdmin();

    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    );
  });

  it("requireAnyAdmin reads session state fresh", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);

    await requireAnyAdmin();

    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    );
  });

  it("requireAuth keeps using the cookie cache (storefront perf path is untouched)", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);

    await requireAuth();

    const call = mocks.getSession.mock.calls[0][0];
    expect(call).not.toHaveProperty("query");
  });

  it("rejects a banned admin even when the session says role=admin", async () => {
    mocks.getSession.mockResolvedValue(mockBannedAdminSession);

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("rejects a banned super_admin", async () => {
    mocks.getSession.mockResolvedValue({
      ...mockSuperAdminSession,
      user: { ...mockSuperAdminSession.user, banned: true, banExpires: null },
    });

    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("rejects a banned staff member via requireAnyAdmin", async () => {
    mocks.getSession.mockResolvedValue({
      ...mockAgentSession,
      user: { ...mockAgentSession.user, banned: true, banExpires: null },
    });

    await expect(requireAnyAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("does not lock out an admin whose ban already expired", async () => {
    mocks.getSession.mockResolvedValue(mockExpiredBanAdminSession);

    const session = await requireAdmin();

    expect(session.user.role).toBe("admin");
  });

  it("rejects an admin whose ban has not expired yet (banExpires in the future)", async () => {
    mocks.getSession.mockResolvedValue({
      ...mockAdminSession,
      user: { ...mockAdminSession.user, banned: true, banExpires: new Date(Date.now() + 60_000) },
    });

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});
