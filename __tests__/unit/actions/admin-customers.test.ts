import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockSuperAdminSession } from "../../helpers/mocks";

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
  dbPrepare: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  batch: mocks.batch,
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: vi.fn().mockResolvedValue({
    prepare: mocks.dbPrepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) }),
    }),
  }),
}));
vi.mock("@/lib/db/admin/audit-log", () => ({
  prepareAuditLog: mocks.prepareAuditLog.mockResolvedValue({ bind: vi.fn() }),
}));

import { updateCustomerRole, toggleCustomerActive } from "@/actions/admin/customers";

describe("updateCustomerRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    mocks.queryFirst.mockResolvedValue({ id: "user-target", role: "customer" });
    mocks.batch.mockResolvedValue([]);
  });

  it("change le rôle d'un utilisateur (super_admin)", async () => {
    const result = await updateCustomerRole("user-target", "admin");
    expect(result.success).toBe(true);
  });

  it("rejette si l'appelant n'est pas super_admin", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    const result = await updateCustomerRole("user-target", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("super administrateurs");
  });

  it("empêche l'auto-rétrogradation", async () => {
    const result = await updateCustomerRole("super-1", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("propre rôle");
  });

  it("permet de garder son propre rôle super_admin", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "super-1", role: "super_admin" });
    const result = await updateCustomerRole("super-1", "super_admin");
    expect(result.success).toBe(true);
  });

  it("rejette si l'utilisateur cible n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await updateCustomerRole("user-x", "admin");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rejette un rôle invalide", async () => {
    const result = await updateCustomerRole("user-target", "invalid_role" as any);
    expect(result.success).toBe(false);
  });

  it("rejette un ID vide", async () => {
    const result = await updateCustomerRole("", "admin");
    expect(result.success).toBe(false);
  });

  it("crée un log d'audit", async () => {
    await updateCustomerRole("user-target", "admin");
    expect(mocks.prepareAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.role_changed", targetId: "user-target" })
    );
  });
});

describe("toggleCustomerActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst.mockResolvedValue({ id: "user-target" });
    mocks.batch.mockResolvedValue([]);
  });

  it("désactive un utilisateur", async () => {
    const result = await toggleCustomerActive("user-target");
    expect(result.success).toBe(true);
  });

  it("crée un log d'audit", async () => {
    await toggleCustomerActive("user-target");
    expect(mocks.prepareAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "user", targetId: "user-target" })
    );
  });

  it("rejette si l'utilisateur n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await toggleCustomerActive("user-x");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rejette un ID vide", async () => {
    const result = await toggleCustomerActive("");
    expect(result.success).toBe(false);
  });

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(toggleCustomerActive("user-target")).rejects.toThrow("NEXT_REDIRECT");
  });
});
