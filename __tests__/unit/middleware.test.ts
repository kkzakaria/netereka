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

import { middleware, PROTECTED_PATHS } from "@/middleware";
import { NOM_COOKIE_CAPTURE } from "@/lib/apercu/jeton-capture";

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

describe("middleware : le laissez-passer d'un capteur d'écran", () => {
  const avecJeton = (chemin: string, jeton = "peu-importe") => {
    const r = new NextRequest(new URL(`https://netereka.ci${chemin}`));
    r.cookies.set(NOM_COOKIE_CAPTURE, jeton);
    return r;
  };

  /**
   * CE MIDDLEWARE NE FAIT QUE LAISSER PASSER, ET C'EST VOLONTAIRE.
   *
   * Il ne regarde que la PRÉSENCE de l'en-tête, jamais sa validité : la
   * signature est vérifiée par la page (`lib/apercu/autorisation.ts`), qui est
   * ce qui rend le contenu. Vérifier ici et transmettre un « c'est bon »
   * rendrait la page sûre uniquement tant que ce middleware tourne — or il
   * s'exécutait sur `/apercu` par accident, ce chemin n'étant pas dans son
   * `config.matcher` avant ce commit.
   *
   * Ces tests fixent donc un comportement qui a l'air laxiste et qui ne l'est
   * pas : un jeton bidon passe ICI et est refusé À LA PAGE.
   */
  it("ne redirige pas une requête porteuse du cookie, même sans session", async () => {
    for (const chemin of ["/apercu/banniere/rev-1", "/apercu/produit/rev-1"]) {
      expect((await middleware(avecJeton(chemin))).status, chemin).toBe(200);
    }
  });

  it("laisse passer même un jeton manifestement faux : la page tranche", async () => {
    expect((await middleware(avecJeton("/apercu/banniere/rev-1", "bidon"))).status).toBe(200);
  });

  // La portée du laissez-passer s'arrête à `/apercu`. Un en-tête posé sur une
  // autre route protégée ne doit rien ouvrir.
  it("n'ouvre AUCUN autre chemin protégé", async () => {
    for (const chemin of ["/dashboard", "/orders", "/account", "/users", "/audit-log"]) {
      const res = await middleware(avecJeton(chemin));
      expect(res.status, chemin).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/auth/sign-in");
    }
  });
});

describe("middleware : ce que le matcher doit couvrir", () => {
  /**
   * `/apercu` ÉTAIT ABSENT de `config.matcher`, et la garde fonctionnait quand
   * même — l'entrée fourre-tout `"/(.*)"`, pourtant filtrée sur l'hôte `www`,
   * faisait tourner le middleware partout (mesuré en production le
   * 2026-10-13). Le jour où ce filtre d'hôte serait honoré à la couche de
   * routage, `/apercu` aurait perdu sa garde EN SILENCE.
   *
   * Ce test exige donc que tout chemin de `PROTECTED_PATHS` soit couvert
   * explicitement : la protection ne doit dépendre d'aucun effet de bord.
   */
  it("couvre explicitement chaque chemin protégé", async () => {
    const { config } = await import("@/middleware");
    const sources = config.matcher.map((m) => (typeof m === "string" ? m : m.source));
    for (const protege of PROTECTED_PATHS) {
      expect(sources, protege).toContain(`${protege}/:path*`);
    }
  });
});

describe("middleware : la canonicalisation du domaine", () => {
  it("redirige www vers l'apex en 301", async () => {
    const res = await middleware(new NextRequest(new URL("https://www.netereka.ci/p/x")));
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location")!).hostname).toBe("netereka.ci");
  });
});
