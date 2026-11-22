import { describe, it, expect } from "vitest";
import {
  SAISON_FETES,
  messageBandeau,
  nomCookieBandeau,
  saisonEnCours,
} from "@/lib/saison/config";

describe("saisonEnCours", () => {
  it.each([
    ["2026-11-30T23:59:59.999Z", false],
    ["2026-12-01T00:00:00.000Z", true],
    ["2026-12-31T23:59:59.999Z", true],
    ["2027-01-01T00:00:00.000Z", true],
    ["2027-01-06T23:59:59.999Z", true],
    ["2027-01-07T00:00:00.000Z", false],
  ])("%s → %s", (instant, attendu) => {
    expect(saisonEnCours(new Date(instant))).toBe(attendu);
  });
});

describe("nomCookieBandeau", () => {
  it("porte l'identifiant de la saison", () => {
    expect(nomCookieBandeau()).toBe("netereka_bandeau_ferme_fetes-2026");
  });

  it("change d'une saison à l'autre, pour que le bandeau revienne l'an prochain", () => {
    expect(nomCookieBandeau({ ...SAISON_FETES, id: "fetes-2027" })).not.toBe(
      nomCookieBandeau(),
    );
  });
});

describe("messageBandeau", () => {
  it("sans date limite, ne promet aucune livraison", () => {
    const message = messageBandeau({ ...SAISON_FETES, dateLimiteLivraisonNoel: null });
    expect(message).toBe(
      "Joyeuses fêtes ! Trouvez le cadeau high-tech idéal chez NETEREKA.",
    );
    expect(message).not.toContain("avant le");
  });

  it("avec une date limite, l'annonce en toutes lettres", () => {
    expect(
      messageBandeau({ ...SAISON_FETES, dateLimiteLivraisonNoel: "2026-12-20" }),
    ).toBe(
      "Joyeuses fêtes ! Commandez avant le 20 décembre pour être livré avant Noël.",
    );
  });

  it("la saison livrée n'invente pas de date limite", () => {
    expect(SAISON_FETES.dateLimiteLivraisonNoel).toBeNull();
  });
});
