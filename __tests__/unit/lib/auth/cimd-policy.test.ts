import { describe, it, expect, vi } from "vitest";
import { isCimdUrlAllowed, redirectUrisChanged, revokeConsentOnRedirectChange } from "@/lib/auth/cimd-policy";

const SITE = "https://netereka.ci";

describe("isCimdUrlAllowed", () => {
  it("refuse notre propre origine (récursion via la chaîne de requête)", () => {
    expect(isCimdUrlAllowed("https://netereka.ci/api/auth/oauth2/authorize?client_id=x", SITE)).toBe(false);
    expect(isCimdUrlAllowed("https://netereka.ci/cimd.json", "https://netereka.ci/")).toBe(false);
  });

  it("accepte une autre origine quand aucune liste blanche n'est définie", () => {
    expect(isCimdUrlAllowed("https://client.example/cimd.json", SITE, [])).toBe(true);
  });

  it("avec une liste blanche, n'accepte que ces origines", () => {
    const allowed = ["https://claude.ai"];
    expect(isCimdUrlAllowed("https://claude.ai/oauth/cimd.json", SITE, allowed)).toBe(true);
    expect(isCimdUrlAllowed("https://claude.ai.evil.example/cimd.json", SITE, allowed)).toBe(false);
    expect(isCimdUrlAllowed("https://other.example/cimd.json", SITE, allowed)).toBe(false);
  });

  it("refuse une URL illisible", () => {
    expect(isCimdUrlAllowed("pas une url", SITE)).toBe(false);
  });
});

describe("redirectUrisChanged", () => {
  it("ignore l'ordre", () => {
    expect(redirectUrisChanged(["https://a/cb", "https://b/cb"], ["https://b/cb", "https://a/cb"])).toBe(false);
  });
  it("détecte un ajout, un retrait et un remplacement", () => {
    expect(redirectUrisChanged(["https://a/cb"], ["https://a/cb", "https://b/cb"])).toBe(true);
    expect(redirectUrisChanged(["https://a/cb", "https://b/cb"], ["https://a/cb"])).toBe(true);
    expect(redirectUrisChanged(["https://a/cb"], ["https://evil/cb"])).toBe(true);
  });
  it("traite undefined comme vide", () => {
    expect(redirectUrisChanged(undefined, [])).toBe(false);
  });
});

describe("revokeConsentOnRedirectChange", () => {
  function event(prev: string[], next: string[], deleteMany = vi.fn().mockResolvedValue(1)) {
    return {
      deleteMany,
      ev: {
        client: { clientId: "https://c.example/cimd.json", redirectUris: next },
        previousClient: { redirectUris: prev },
        context: { context: { adapter: { deleteMany }, logger: { error: vi.fn() } } },
      } as never,
    };
  }

  it("supprime les consentements du client quand ses redirect_uris changent", async () => {
    const { deleteMany, ev } = event(["https://a/cb"], ["https://evil/cb"]);
    await revokeConsentOnRedirectChange(ev);
    expect(deleteMany).toHaveBeenCalledWith({
      model: "oauthConsent",
      where: [{ field: "clientId", value: "https://c.example/cimd.json" }],
    });
  });

  it("ne touche à rien quand les redirect_uris sont inchangés", async () => {
    const { deleteMany, ev } = event(["https://a/cb"], ["https://a/cb"]);
    await revokeConsentOnRedirectChange(ev);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("propage l'échec de suppression (journalisé par la bibliothèque)", async () => {
    const { ev } = event(["https://a/cb"], ["https://b/cb"], vi.fn().mockRejectedValue(new Error("d1")));
    await expect(revokeConsentOnRedirectChange(ev)).rejects.toThrow("d1");
  });
});
