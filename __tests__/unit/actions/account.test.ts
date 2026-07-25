import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  updateUser: vi.fn(),
  changePasswordApi: vi.fn(),
  cookieStoreSet: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ set: mocks.cookieStoreSet }),
}));
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
    mocks.changePasswordApi.mockResolvedValue({
      response: { token: null, user: mockCustomerSession.user },
      headers: new Headers(),
    });
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

  it("révoque les autres sessions de l'utilisateur", async () => {
    await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });

    expect(mocks.changePasswordApi).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ revokeOtherSessions: true }),
      })
    );
  });

  it("demande les en-têtes de réponse pour pouvoir réappliquer le cookie de session", async () => {
    await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });

    expect(mocks.changePasswordApi).toHaveBeenCalledWith(
      expect.objectContaining({ returnHeaders: true })
    );
  });

  it("réapplique le nouveau cookie de session renvoyé par better-auth", async () => {
    // revokeOtherSessions:true fait tourner TOUTES les sessions, y compris celle
    // de l'appelant : better-auth renvoie un nouveau cookie de session via les
    // en-têtes de réponse plutôt que de l'exclure de la révocation. Sans ce
    // report, le navigateur qui vient de changer son mot de passe pointerait
    // vers une session supprimée et serait déconnecté à la prochaine vérification.
    const setCookieHeaders = new Headers();
    setCookieHeaders.append(
      "set-cookie",
      "better-auth.session_token=new-token-value; Path=/; HttpOnly; SameSite=Lax"
    );
    mocks.changePasswordApi.mockResolvedValue({
      response: { token: "new-token-value", user: mockCustomerSession.user },
      headers: setCookieHeaders,
    });

    const result = await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });

    expect(result.success).toBe(true);
    expect(mocks.cookieStoreSet).toHaveBeenCalledWith(
      "better-auth.session_token",
      "new-token-value",
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("n'échoue pas si better-auth ne renvoie aucun cookie à réappliquer", async () => {
    mocks.changePasswordApi.mockResolvedValue({
      response: { token: null, user: mockCustomerSession.user },
      headers: new Headers(),
    });

    const result = await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });

    expect(result.success).toBe(true);
    expect(mocks.cookieStoreSet).not.toHaveBeenCalled();
  });
});
