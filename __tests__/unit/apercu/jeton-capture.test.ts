import { describe, it, expect } from "vitest";
import {
  DUREE_DE_VIE_MAX_MS,
  DUREE_DE_VIE_MS,
  EN_TETE_CAPTURE,
  emettreJetonDeCapture,
  messageSigne,
  verifierJetonDeCapture,
} from "@/lib/apercu/jeton-capture";

const SECRET = "un-secret-d-authentification-de-test-assez-long";
const AUTRE_SECRET = "un-autre-secret-de-test-tout-aussi-long-que-lui";
const CHEMIN = "/apercu/banniere/rev-42";
const T0 = 1_760_000_000_000;

describe("émission puis vérification", () => {
  it("un jeton frais vaut pour SON chemin", async () => {
    const jeton = await emettreJetonDeCapture(SECRET, CHEMIN, T0);
    expect(await verifierJetonDeCapture(SECRET, CHEMIN, jeton, T0 + 1_000)).toEqual({
      valide: true,
    });
  });

  // La portée est tout l'intérêt : un laissez-passer pour une page ne doit pas
  // en ouvrir une autre, et surtout pas une page d'administration.
  it("ne vaut PAS pour un autre chemin", async () => {
    const jeton = await emettreJetonDeCapture(SECRET, CHEMIN, T0);
    for (const autre of [
      "/apercu/banniere/rev-43",
      "/apercu/produit/rev-42",
      "/admin/products",
      "/apercu/banniere/rev-42/",
      CHEMIN.toUpperCase(),
    ]) {
      const v = await verifierJetonDeCapture(SECRET, autre, jeton, T0 + 1_000);
      expect(v.valide, autre).toBe(false);
    }
  });

  /**
   * LE SÉPARATEUR, ÉPROUVÉ POUR CE QU'IL EMPÊCHE.
   *
   * Ma première version de ce test ne prouvait rien : retirer le « \n » de
   * l'implémentation la laissait verte. L'ambiguïté se voit sur le MESSAGE
   * signé, pas sur un aller-retour — un jeton pour `/a/b` expirant à 12345
   * et un jeton pour `/a/b1` expirant à 2345 signeraient la même chaîne, et
   * le second se fabriquerait depuis le premier en réécrivant le seul champ
   * que l'attaquant contrôle : l'expiration.
   */
  it("le message signé n'est JAMAIS ambigu entre chemin et expiration", () => {
    expect(messageSigne("/a/b", 12345)).not.toBe(messageSigne("/a/b1", 2345));
    expect(messageSigne("/a/b", 12345)).toBe("/a/b\n12345");
    // Un chemin d'URL ne peut pas contenir de retour à la ligne : le
    // séparateur ne peut donc pas être injecté depuis le chemin.
    expect(messageSigne("/a/b", 1).split("\n")).toHaveLength(2);
  });

  it("ne vaut pas sous un autre secret", async () => {
    const jeton = await emettreJetonDeCapture(SECRET, CHEMIN, T0);
    const v = await verifierJetonDeCapture(AUTRE_SECRET, CHEMIN, jeton, T0 + 1_000);
    expect(v.valide).toBe(false);
    if (!v.valide) expect(v.raison).toBe("signature invalide");
  });
});

describe("durée de vie", () => {
  it("refuse après expiration, et pile à l'expiration", async () => {
    const jeton = await emettreJetonDeCapture(SECRET, CHEMIN, T0);
    expect((await verifierJetonDeCapture(SECRET, CHEMIN, jeton, T0 + DUREE_DE_VIE_MS)).valide)
      .toBe(false);
    const tard = await verifierJetonDeCapture(SECRET, CHEMIN, jeton, T0 + DUREE_DE_VIE_MS + 1);
    expect(tard.valide).toBe(false);
    if (!tard.valide) expect(tard.raison).toBe("jeton expiré");
  });

  // Le plafond n'est pas une redondance : la signature COUVRE l'expiration,
  // donc un jeton d'un an serait parfaitement valide. C'est le seul endroit
  // qui refuse un laissez-passer durable correctement signé.
  it("REFUSE un jeton d'un an, même signé correctement", async () => {
    const lointain = T0 + 365 * 24 * 3_600_000;
    // On émet à la main, comme le ferait un appel fautif ou malveillant.
    const emisAuFutur = await emettreJetonDeCapture(SECRET, CHEMIN, lointain - DUREE_DE_VIE_MS);
    const v = await verifierJetonDeCapture(SECRET, CHEMIN, emisAuFutur, T0);
    expect(v.valide).toBe(false);
    if (!v.valide) expect(v.raison).toContain("plafond");
    expect(DUREE_DE_VIE_MAX_MS).toBeGreaterThan(DUREE_DE_VIE_MS);
  });
});

describe("entrées hostiles", () => {
  it("refuse l'absence, le vide et les formes tordues sans lever", async () => {
    for (const mauvais of [
      null,
      undefined,
      "",
      ".",
      "abc",
      ".abc",
      `${T0 + 1000}`,
      `${T0 + 1000}.`,
      `1e20.${"A".repeat(43)}`,
      `0x10.${"A".repeat(43)}`,
      ` ${T0 + 1000}.${"A".repeat(43)}`,
      `-1.${"A".repeat(43)}`,
      `${T0 + 1000}.!!!!`,
      `${T0 + 1000}.${"A".repeat(10)}`,
    ]) {
      const v = await verifierJetonDeCapture(SECRET, CHEMIN, mauvais as string | null, T0);
      expect(v.valide, JSON.stringify(mauvais)).toBe(false);
    }
  });

  /**
   * UNE EXPIRATION QUI SE LIT AUTREMENT QU'ELLE NE S'ÉCRIT.
   *
   * Ce test manquait, et son absence laissait passer la suppression du
   * contrôle décimal : `Number(" 12345")` et `Number("+12345")` valent tous
   * deux 12345, donc la signature d'un jeton VALIDE resterait bonne alors
   * que la chaîne présentée n'est pas celle qui a été signée. On n'accepte
   * donc que des chiffres décimaux SANS zéro initial — ce qui est vérifié est
   * exactement ce qui a été signé, et le jeton n'a qu'une seule écriture
   * valide. Le zéro initial est venu de ce test : `0<exp>` passait, et le même
   * laissez-passer avait une infinité de formes acceptées.
   */
  it("refuse une expiration qui ne s'écrit pas en chiffres décimaux", async () => {
    const jeton = await emettreJetonDeCapture(SECRET, CHEMIN, T0);
    const [exp, sig] = [jeton.slice(0, jeton.indexOf(".")), jeton.slice(jeton.indexOf(".") + 1)];
    for (const deguise of [` ${exp}`, `+${exp}`, `${exp} `, `0${exp}`, `00${exp}`]) {
      const v = await verifierJetonDeCapture(SECRET, CHEMIN, `${deguise}.${sig}`, T0 + 1_000);
      expect(v.valide, deguise).toBe(false);
    }
    // Le jeton intact, lui, passe : c'est bien la FORME qui est refusée.
    expect((await verifierJetonDeCapture(SECRET, CHEMIN, jeton, T0 + 1_000)).valide).toBe(true);
  });

  it("nomme toujours un motif, pour qu'un refus se journalise", async () => {
    const v = await verifierJetonDeCapture(SECRET, CHEMIN, null, T0);
    expect(v).toEqual({ valide: false, raison: "en-tête absent" });
  });

  it("le nom de l'en-tête est en minuscules, comme les en-têtes HTTP/2", () => {
    expect(EN_TETE_CAPTURE).toBe(EN_TETE_CAPTURE.toLowerCase());
  });
});

/**
 * RÉPONSE CONNUE — ce test PINGLE le schéma, il ne le valide pas.
 *
 * La valeur attendue a été produite par cette implémentation : elle ne prouve
 * donc pas que le schéma est bon. Ce qu'elle prouve, et qui manquait, c'est
 * que PLUS RIEN ne change sans qu'on le voie — ni l'étiquette de séparation
 * de domaine, ni la dérivation en deux HMAC, ni l'encodage base64url, ni la
 * forme du jeton sur le réseau. La séparation de domaine n'est pas observable
 * depuis ce module (signer avec le secret brut donnerait un couple
 * signature/vérification tout aussi cohérent) : cette épingle est le seul
 * garde-fou qui la tienne.
 */
describe("réponse connue", () => {
  it("le jeton produit est exactement celui-ci", async () => {
    const jeton = await emettreJetonDeCapture(
      "secret-fixe-pour-le-test-de-reponse-connue",
      "/apercu/banniere/rev-1",
      1_700_000_000_000,
    );
    expect(jeton).toBe("1700000060000.c_9R3KlUirJS4xoJYTe3ETM5qYme--A9OdEzqSVgACc");
  });
});
