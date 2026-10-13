import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getEnv: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));

import { autoriserApercu, sujetApercu } from "@/lib/apercu/autorisation";
import { EN_TETE_CAPTURE, emettreJetonDeCapture } from "@/lib/apercu/jeton-capture";

const SECRET = "secret-de-test-pour-l-autorisation-d-apercu";

const avecEnTete = (valeur: string | null) =>
  mocks.headers.mockResolvedValue(new Headers(valeur ? { [EN_TETE_CAPTURE]: valeur } : {}));

beforeEach(() => {
  // mockReset, pas clearAllMocks : l'ordre des tests est tiré au sort et seule
  // la réinitialisation efface AUSSI l'implémentation.
  mocks.headers.mockReset();
  mocks.getEnv.mockReset().mockResolvedValue({ BETTER_AUTH_SECRET: SECRET });
  mocks.requireAdmin.mockReset().mockResolvedValue(undefined);
});

describe("sujetApercu", () => {
  it("construit le sujet signé depuis le type et la révision", () => {
    expect(sujetApercu("banniere", "rev-42")).toBe("apercu/banniere/rev-42");
    expect(sujetApercu("produit", "rev-42")).toBe("apercu/produit/rev-42");
  });

  // Le sujet n'est PAS l'URL : la page n'a pas à reconstruire son chemin, ce
  // qui ferait échouer un jeton légitime sur une barre finale.
  it("ne dépend d'aucune reconstruction d'URL", () => {
    expect(sujetApercu("banniere", "rev-42")).not.toContain("http");
    expect(sujetApercu("banniere", "rev-42").startsWith("/")).toBe(false);
  });
});

describe("autoriserApercu", () => {
  it("laisse passer un laissez-passer valide SANS toucher à la session", async () => {
    avecEnTete(await emettreJetonDeCapture(SECRET, sujetApercu("banniere", "rev-1")));
    await expect(autoriserApercu("banniere", "rev-1")).resolves.toBeUndefined();
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  // La portée du jeton est tout l'intérêt : il ne doit pas se promener d'une
  // révision à l'autre, ni d'un type à l'autre.
  it("retombe sur la session quand le jeton vise une AUTRE révision", async () => {
    avecEnTete(await emettreJetonDeCapture(SECRET, sujetApercu("banniere", "rev-1")));
    for (const [type, id] of [["banniere", "rev-2"], ["produit", "rev-1"]] as const) {
      mocks.requireAdmin.mockClear();
      await autoriserApercu(type, id);
      expect(mocks.requireAdmin, `${type}/${id}`).toHaveBeenCalledOnce();
    }
  });

  it("retombe sur la session quand il n'y a pas d'en-tête du tout", async () => {
    avecEnTete(null);
    await autoriserApercu("banniere", "rev-1");
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
  });

  it("retombe sur la session pour un jeton forgé ou expiré", async () => {
    for (const mauvais of ["n'importe quoi", "1.AAAA", `${Date.now() - 1}.AAAA`]) {
      avecEnTete(mauvais);
      mocks.requireAdmin.mockClear();
      await autoriserApercu("banniere", "rev-1");
      expect(mocks.requireAdmin, mauvais).toHaveBeenCalledOnce();
    }
  });

  // Un jeton refusé doit laisser une trace : sinon une capture qui ramène la
  // page de connexion n'a aucune explication consultable.
  it("journalise le motif d'un refus, sans le rendre", async () => {
    const journal = vi.spyOn(console, "warn").mockImplementation(() => {});
    avecEnTete("1.AAAA");
    await autoriserApercu("banniere", "rev-1");
    expect(journal).toHaveBeenCalledWith(expect.stringContaining("[apercu]"));
    journal.mockRestore();
  });

  // Si la redirection de `requireAdmin` ne remontait pas, la page rendrait la
  // révision à un visiteur quelconque.
  it("propage la redirection de requireAdmin", async () => {
    avecEnTete(null);
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(autoriserApercu("banniere", "rev-1")).rejects.toThrow("NEXT_REDIRECT");
  });
});
