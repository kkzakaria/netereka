import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
  changePasswordApi: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT: ${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    api: {
      getSession: mocks.getSession,
      updateUser: mocks.updateUser,
      changePassword: mocks.changePasswordApi,
    },
  }),
}));

import { updateProfile, changePassword } from "@/actions/account";

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.updateUser.mockResolvedValue({});
  });

  it("met à jour le profil avec des données valides", async () => {
    const result = await updateProfile({ name: "Nouveau Nom", phone: "0708091011" });
    expect(result.success).toBe(true);
  });

  it("rejette un nom trop court", async () => {
    const result = await updateProfile({ name: "A", phone: "0102030405" });
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("rejette un numéro invalide", async () => {
    const result = await updateProfile({ name: "Nom Valide", phone: "123" });
    expect(result.success).toBe(false);
  });

  it("redirige si non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(updateProfile({ name: "Test", phone: "0102030405" })).rejects.toThrow("NEXT_REDIRECT");
  });

  it("nettoie les espaces dans le téléphone", async () => {
    const result = await updateProfile({ name: "Amadou", phone: "01 02 03 04 05" });
    expect(result.success).toBe(true);
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.changePasswordApi.mockResolvedValue({});
  });

  it("change le mot de passe avec des données valides", async () => {
    const result = await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });
    expect(result.success).toBe(true);
  });

  it("rejette si les mots de passe ne correspondent pas", async () => {
    const result = await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un nouveau mot de passe trop court", async () => {
    const result = await changePassword({
      currentPassword: "ancien",
      newPassword: "court",
      confirmPassword: "court",
    });
    expect(result.success).toBe(false);
  });

  it("retourne une erreur si le mot de passe actuel est incorrect", async () => {
    mocks.changePasswordApi.mockRejectedValue(new Error("Invalid"));
    const result = await changePassword({
      currentPassword: "mauvais",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Mot de passe actuel incorrect");
  });
});
