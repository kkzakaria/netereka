import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockSuperAdminSession, mockAgentSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  queryFirst: vi.fn(),
  batch: vi.fn(),
  prepareAuditLog: vi.fn(),
  setRole: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    api: {
      getSession: mocks.getSession,
      setRole: mocks.setRole,
      banUser: mocks.banUser,
      unbanUser: mocks.unbanUser,
    },
  }),
}));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  batch: mocks.batch,
}));
vi.mock("@/lib/db/admin/audit-log", () => ({
  prepareAuditLog: mocks.prepareAuditLog.mockResolvedValue({ bind: vi.fn() }),
}));

import { updateUserRole, banCustomer, unbanCustomer } from "@/actions/admin/customers";

describe("updateUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    mocks.queryFirst.mockResolvedValue({ id: "user-target", role: "agent" });
    mocks.batch.mockResolvedValue([]);
    mocks.setRole.mockResolvedValue({ user: { id: "user-target", role: "admin" } });
  });

  it("change le rôle d'un utilisateur staff (super_admin)", async () => {
    const result = await updateUserRole("user-target", "admin");
    expect(result.success).toBe(true);
    expect(mocks.setRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ userId: "user-target", role: "admin" }) })
    );
  });

  it("rejette si l'appelant n'est pas super_admin", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    await expect(updateUserRole("user-target", "admin")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("interdit la promotion customer → staff", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "user-target", role: "customer" });
    const result = await updateUserRole("user-target", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("client");
  });

  it("empêche l'auto-rétrogradation", async () => {
    const result = await updateUserRole("super-1", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("propre rôle");
  });

  it("permet de garder son propre rôle super_admin", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "super-1", role: "super_admin" });
    const result = await updateUserRole("super-1", "super_admin");
    expect(result.success).toBe(true);
  });

  it("rejette si l'utilisateur cible n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await updateUserRole("user-x", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rejette un rôle invalide", async () => {
    // @ts-expect-error -- testing invalid role
    const result = await updateUserRole("user-target", "invalid_role");
    expect(result.success).toBe(false);
  });

  it("rejette un ID vide", async () => {
    const result = await updateUserRole("", "admin");
    expect(result.success).toBe(false);
  });

  it("retourne une erreur si setRole lève une exception", async () => {
    mocks.setRole.mockRejectedValue(new Error("Plugin error"));
    const result = await updateUserRole("user-target", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("crée un log d'audit", async () => {
    await updateUserRole("user-target", "admin");
    expect(mocks.prepareAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.role_changed", targetId: "user-target" })
    );
  });
});

describe("banCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst.mockResolvedValue({ id: "user-target", role: "customer" });
    mocks.batch.mockResolvedValue([]);
    mocks.banUser.mockResolvedValue({ user: { id: "user-target" } });
  });

  it("banne un utilisateur", async () => {
    const result = await banCustomer("user-target");
    expect(result.success).toBe(true);
    expect(mocks.banUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ userId: "user-target" }) })
    );
  });

  it("transmet la raison de bannissement à banUser", async () => {
    await banCustomer("user-target", "Comportement abusif");
    expect(mocks.banUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ banReason: "Comportement abusif" }) })
    );
  });

  it("crée un log d'audit", async () => {
    await banCustomer("user-target");
    expect(mocks.prepareAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.banned", targetId: "user-target", targetType: "user" })
    );
  });

  it("retourne une erreur si banUser lève une exception", async () => {
    mocks.banUser.mockRejectedValue(new Error("Plugin error"));
    const result = await banCustomer("user-target");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejette si l'utilisateur n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await banCustomer("user-x");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rejette un ID vide", async () => {
    const result = await banCustomer("");
    expect(result.success).toBe(false);
  });

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(banCustomer("user-target")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette si agent (droits insuffisants)", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);
    await expect(banCustomer("user-target")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("refuse de bannir un utilisateur avec le rôle admin", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "admin-target", role: "admin" });
    const result = await banCustomer("admin-target");
    expect(result.success).toBe(false);
    expect(result.error).toContain("administrateur");
    expect(mocks.banUser).not.toHaveBeenCalled();
  });

  it("refuse de bannir un utilisateur avec le rôle super_admin", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "super-target", role: "super_admin" });
    const result = await banCustomer("super-target");
    expect(result.success).toBe(false);
    expect(result.error).toContain("administrateur");
    expect(mocks.banUser).not.toHaveBeenCalled();
  });

  it("retourne une erreur si la requête DB échoue", async () => {
    mocks.queryFirst.mockRejectedValue(new Error("D1 error"));
    const result = await banCustomer("user-target");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mocks.banUser).not.toHaveBeenCalled();
  });
});

describe("unbanCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst.mockResolvedValue({ id: "user-target" });
    mocks.batch.mockResolvedValue([]);
    mocks.unbanUser.mockResolvedValue({ user: { id: "user-target" } });
  });

  it("débanne un utilisateur", async () => {
    const result = await unbanCustomer("user-target");
    expect(result.success).toBe(true);
    expect(mocks.unbanUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ userId: "user-target" }) })
    );
  });

  it("crée un log d'audit", async () => {
    await unbanCustomer("user-target");
    expect(mocks.prepareAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.unbanned", targetId: "user-target", targetType: "user" })
    );
  });

  it("rejette si l'utilisateur n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await unbanCustomer("user-x");
    expect(result.success).toBe(false);
  });

  it("rejette un ID vide", async () => {
    const result = await unbanCustomer("");
    expect(result.success).toBe(false);
  });

  it("redirige si agent (droits insuffisants)", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);
    await expect(unbanCustomer("user-target")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("retourne une erreur si unbanUser lève une exception", async () => {
    mocks.unbanUser.mockRejectedValue(new Error("Plugin error"));
    const result = await unbanCustomer("user-target");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
