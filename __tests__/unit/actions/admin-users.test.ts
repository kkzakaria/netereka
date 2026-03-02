import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSuperAdminSession, mockAdminSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  createUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    api: {
      getSession: mocks.getSession,
      createUser: mocks.createUser,
    },
  }),
}));

import { createAdminUser } from "@/actions/admin/users";

describe("createAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    mocks.createUser.mockResolvedValue({ user: { id: "new-user-123" } });
  });

  it("crée un compte admin", async () => {
    const result = await createAdminUser({
      name: "Jean Dupont",
      email: "jean@netereka.ci",
      password: "TempPass123!",
      role: "admin",
    });
    expect(result.success).toBe(true);
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Jean Dupont",
          role: "admin",
          data: expect.objectContaining({ emailVerified: true }),
        }),
      })
    );
  });

  it("crée un compte agent", async () => {
    const result = await createAdminUser({
      name: "Aya Koné",
      email: "aya@netereka.ci",
      password: "TempPass123!",
      role: "agent",
    });
    expect(result.success).toBe(true);
  });

  it("crée un compte super_admin", async () => {
    const result = await createAdminUser({
      name: "Boss",
      email: "boss@netereka.ci",
      password: "TempPass123!",
      role: "super_admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejette si non super_admin (admin ordinaire)", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    await expect(
      createAdminUser({ name: "X", email: "x@x.ci", password: "Pass1234!", role: "admin" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(
      createAdminUser({ name: "X", email: "x@x.ci", password: "Pass1234!", role: "admin" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette un email invalide", async () => {
    const result = await createAdminUser({
      name: "X",
      email: "not-an-email",
      password: "Pass1234!",
      role: "admin",
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.email).toBeDefined();
  });

  it("rejette un mot de passe trop court", async () => {
    const result = await createAdminUser({
      name: "X",
      email: "x@netereka.ci",
      password: "abc",
      role: "admin",
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.password).toBeDefined();
  });

  it("rejette un nom trop court", async () => {
    const result = await createAdminUser({
      name: "X",
      email: "x@netereka.ci",
      password: "Pass1234!",
      role: "admin",
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it("rejette le rôle customer", async () => {
    // @ts-expect-error -- customer n'est pas autorisé
    const result = await createAdminUser({ name: "Xx", email: "x@x.ci", password: "Pass1234!", role: "customer" });
    expect(result.success).toBe(false);
  });

  it("retourne une erreur si createUser retourne null", async () => {
    mocks.createUser.mockResolvedValue({ user: null });
    const result = await createAdminUser({
      name: "Jean Dupont",
      email: "jean@netereka.ci",
      password: "TempPass123!",
      role: "admin",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("retourne une erreur si createUser lève une exception", async () => {
    mocks.createUser.mockRejectedValue(new Error("Email déjà utilisé"));
    const result = await createAdminUser({
      name: "Jean Dupont",
      email: "jean@netereka.ci",
      password: "TempPass123!",
      role: "admin",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
