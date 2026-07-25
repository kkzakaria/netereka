import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIError } from "better-auth";
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
    // Forme réelle levée par better-auth (update-user.mjs) avant toute
    // écriture — APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_PASSWORD).
    mocks.changePasswordApi.mockRejectedValue(
      new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Invalid password" })
    );
    const result = await changePassword({
      currentPassword: "mauvais",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Mot de passe actuel incorrect");
  });

  it("ne signale pas « mot de passe incorrect » quand l'échec survient après l'écriture du nouveau mot de passe", async () => {
    // revokeOtherSessions:true fait tourner deleteUserSessions puis
    // createSession APRÈS que le nouveau hash a été écrit (update-user.mjs) :
    // une erreur ici (D1 transitoire, hook admin qui échoue) ne doit jamais
    // être confondue avec l'échec de vérification du mot de passe actuel.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.changePasswordApi.mockRejectedValue(
      new APIError("INTERNAL_SERVER_ERROR", { code: "FAILED_TO_GET_SESSION" })
    );

    const result = await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain("Mot de passe actuel incorrect");
    expect(result.error).toMatch(/nouveau mot de passe/i);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[changePassword]"),
      expect.anything()
    );

    errorSpy.mockRestore();
  });

  it("ne signale pas « mot de passe incorrect » pour une erreur qui n'est pas une APIError", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.changePasswordApi.mockRejectedValue(new Error("D1 transient failure"));

    const result = await changePassword({
      currentPassword: "ancien123",
      newPassword: "nouveau123",
      confirmPassword: "nouveau123",
    });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain("Mot de passe actuel incorrect");

    errorSpy.mockRestore();
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

  it("réapplique tous les cookies de session renvoyés par better-auth", async () => {
    // revokeOtherSessions:true fait tourner TOUTES les sessions, y compris celle
    // de l'appelant : better-auth renvoie un nouveau cookie de session via les
    // en-têtes de réponse plutôt que de l'exclure de la révocation. Sans ce
    // report, le navigateur qui vient de changer son mot de passe pointerait
    // vers une session supprimée et serait déconnecté à la prochaine vérification.
    //
    // En production, cookieCache.enabled est actif : setSessionCookie émet
    // toujours DEUX cookies (session_token + session_data), avec Secure,
    // Max-Age et le préfixe __Secure- une fois déployé. Un rejeu qui ne
    // traiterait que le premier cookie du Set-Cookie serait une régression
    // critique — ce test couvre donc les deux, avec leurs attributs complets.
    const setCookieHeaders = new Headers();
    setCookieHeaders.append(
      "set-cookie",
      "__Secure-better-auth.session_token=new-token-value; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax"
    );
    setCookieHeaders.append(
      "set-cookie",
      "__Secure-better-auth.session_data=new-session-payload; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=Lax"
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
    expect(mocks.cookieStoreSet).toHaveBeenCalledTimes(2);
    expect(mocks.cookieStoreSet).toHaveBeenNthCalledWith(
      1,
      "__Secure-better-auth.session_token",
      "new-token-value",
      {
        maxAge: 604800,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }
    );
    expect(mocks.cookieStoreSet).toHaveBeenNthCalledWith(
      2,
      "__Secure-better-auth.session_data",
      "new-session-payload",
      {
        maxAge: 300,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }
    );
  });

  it("journalise un avertissement mais réussit tout de même si better-auth ne renvoie aucun cookie à réappliquer", async () => {
    // revokeOtherSessions est désormais toujours à true, donc l'absence d'un
    // set-cookie n'est plus un cas bénin : la rotation de session n'a pas été
    // exposée et le cookie de l'appelant pointe vers une session supprimée.
    // Le changement de mot de passe a néanmoins réussi côté serveur — échouer
    // l'action serait pire pour l'utilisateur — donc ce cas doit rester
    // observable (avertissement journalisé) plutôt qu'invisible.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
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
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[changePassword]"));

    warnSpy.mockRestore();
  });

  it("réussit et journalise l'erreur si la réapplication du cookie échoue après un changement de mot de passe déjà effectué", async () => {
    // Le mot de passe a déjà changé et les sessions ont déjà été révoquées
    // côté serveur avant que ce rejeu ne s'exécute (setSessionCookie a déjà
    // tourné dans update-user.mjs). Si cookies().set() lève ici — ce que
    // Next.js fait hors d'un contexte de mutation autorisé, la raison même
    // pour laquelle nextCookies() en amont capture la même opération — cela
    // ne doit jamais être rapporté comme « mot de passe incorrect » : ce
    // serait faire croire à l'appelant que rien ne s'est passé.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.cookieStoreSet.mockImplementation(() => {
      throw new Error("cookies() called outside a mutable context");
    });
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
    expect(result.error).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("[changePassword]"), expect.any(Error));

    errorSpy.mockRestore();
  });
});
