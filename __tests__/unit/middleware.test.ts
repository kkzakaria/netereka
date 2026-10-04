import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Le middleware n'avait AUCUN test, et c'est lui qui décide quelles pages
 * exigent une session AVANT tout rendu.
 *
 * L'enjeu est précis : une page peut appeler `requireAdmin()` et être quand
 * même servie en 200 d'abord. `app/(storefront)/loading.tsx` place les pages
 * de ce groupe sous un `<Suspense>` — le gabarit part donc avant que la garde
 * s'exécute, et la redirection devient une affaire de navigateur. C'est ce
 * qui arrivait à `/apercu`, nouvellement logé dans ce groupe : un visiteur
 * non authentifié voyait un instant l'en-tête et un squelette, et un
 * administrateur déconnecté perdait le lien, `requireAdmin()` ne gardant
 * aucun retour.
 */
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => { throw new Error("pas de binding en test"); },
}));

import { middleware } from "@/middleware";

const requete = (chemin: string, avecSession = false) => {
  const r = new NextRequest(new URL(`https://netereka.ci${chemin}`));
  if (avecSession) r.cookies.set("better-auth.session_token", "jeton");
  return r;
};

describe("middleware : les chemins qui exigent une session", () => {
  it.each([
    ["/apercu/banniere/rev-1"],
    ["/apercu/produit/rev-1"],
    ["/dashboard"],
    ["/orders"],
    ["/account"],
  ])("redirige %s sans session, en gardant le retour", async (chemin) => {
    const res = await middleware(requete(chemin));
    expect(res.status).toBe(307);
    const dest = new URL(res.headers.get("location")!);
    expect(dest.pathname).toBe("/auth/sign-in");
    // Le retour est conservé : sans lui, un administrateur déconnecté perd le
    // lien qu'il venait d'ouvrir.
    expect(dest.searchParams.get("redirect")).toBe(chemin);
  });

  it("laisse passer avec une session : c'est la page qui juge le rôle", async () => {
    const res = await middleware(requete("/apercu/banniere/rev-1", true));
    expect(res.status).toBe(200);
  });

  it.each([["/"], ["/p/un-produit"], ["/c/smartphones"], ["/auth/sign-in"]])(
    "laisse passer %s sans session",
    async (chemin) => {
      expect((await middleware(requete(chemin))).status).toBe(200);
    },
  );
});

describe("middleware : la canonicalisation du domaine", () => {
  it("redirige www vers l'apex en 301", async () => {
    const res = await middleware(new NextRequest(new URL("https://www.netereka.ci/p/x")));
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location")!).hostname).toBe("netereka.ci");
  });
});
