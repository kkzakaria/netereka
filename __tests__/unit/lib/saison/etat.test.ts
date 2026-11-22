import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getOptionalSession: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/auth/guards", () => ({ getOptionalSession: mocks.getOptionalSession }));

import { getEtatSaison, resoudreEtatSaison } from "@/lib/saison/etat";

const PENDANT = new Date("2026-12-10T10:00:00Z");
const AVANT = new Date("2026-11-25T10:00:00Z");

describe("resoudreEtatSaison", () => {
  it("pendant la saison, le décor et le bandeau s'affichent", () => {
    expect(
      resoudreEtatSaison({ maintenant: PENDANT, apercuAdmin: false, bandeauFerme: false }),
    ).toEqual({ festif: true, bandeauVisible: true, apercu: false });
  });

  it("un bandeau fermé reste fermé, le décor reste", () => {
    expect(
      resoudreEtatSaison({ maintenant: PENDANT, apercuAdmin: false, bandeauFerme: true }),
    ).toEqual({ festif: true, bandeauVisible: false, apercu: false });
  });

  it("hors saison, rien ne s'affiche", () => {
    expect(
      resoudreEtatSaison({ maintenant: AVANT, apercuAdmin: false, bandeauFerme: false }),
    ).toEqual({ festif: false, bandeauVisible: false, apercu: false });
  });

  it("hors saison, l'aperçu admin montre tout et se signale", () => {
    expect(
      resoudreEtatSaison({ maintenant: AVANT, apercuAdmin: true, bandeauFerme: false }),
    ).toEqual({ festif: true, bandeauVisible: true, apercu: true });
  });
});

describe("getEtatSaison", () => {
  function cookiesPresents(valeurs: Record<string, string>) {
    mocks.cookies.mockResolvedValue({
      get: (nom: string) => (nom in valeurs ? { name: nom, value: valeurs[nom] } : undefined),
    });
  }

  beforeEach(() => {
    mocks.cookies.mockReset();
    mocks.getOptionalSession.mockReset();
    mocks.getOptionalSession.mockResolvedValue(null);
    vi.useFakeTimers({ now: AVANT, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sans cookie d'aperçu, ne lit pas la session (coût nul pour les visiteurs)", async () => {
    cookiesPresents({});
    expect((await getEtatSaison()).festif).toBe(false);
    expect(mocks.getOptionalSession).not.toHaveBeenCalled();
  });

  it("un cookie d'aperçu sur un compte client n'ouvre rien", async () => {
    cookiesPresents({ netereka_apercu_saison: "1" });
    mocks.getOptionalSession.mockResolvedValue({ user: { role: "customer" } });
    expect((await getEtatSaison()).festif).toBe(false);
  });

  it("un cookie d'aperçu sans session n'ouvre rien", async () => {
    cookiesPresents({ netereka_apercu_saison: "1" });
    expect((await getEtatSaison()).festif).toBe(false);
  });

  it("une session illisible n'ouvre rien et ne fait pas tomber la page", async () => {
    cookiesPresents({ netereka_apercu_saison: "1" });
    mocks.getOptionalSession.mockRejectedValue(new Error("D1 indisponible"));
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await getEtatSaison()).festif).toBe(false);
    expect(erreur).toHaveBeenCalled();
    erreur.mockRestore();
  });

  it.each(["admin", "super_admin"])("un cookie d'aperçu sur un compte %s montre le thème", async (role) => {
    cookiesPresents({ netereka_apercu_saison: "1" });
    mocks.getOptionalSession.mockResolvedValue({ user: { role } });
    expect(await getEtatSaison()).toMatchObject({ festif: true, apercu: true });
  });

  it("le cookie de fermeture de cette saison masque le bandeau", async () => {
    vi.setSystemTime(PENDANT);
    cookiesPresents({ "netereka_bandeau_ferme_fetes-2026": "1" });
    expect((await getEtatSaison()).bandeauVisible).toBe(false);
  });

  it("le cookie de fermeture d'une saison passée ne masque rien", async () => {
    vi.setSystemTime(PENDANT);
    cookiesPresents({ "netereka_bandeau_ferme_fetes-2025": "1" });
    expect((await getEtatSaison()).bandeauVisible).toBe(true);
  });
});
