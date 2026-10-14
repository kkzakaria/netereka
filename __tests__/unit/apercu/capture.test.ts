import { describe, it, expect, vi } from "vitest";
import {
  CAPTURE_MAX_OCTETS,
  ECRANS,
  EchecDeCapture,
  capturer,
  octetsDeLaCapture,
  type LiaisonNavigateur,
} from "@/lib/apercu/capture";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

/**
 * LA FORME RENDUE PAR LA LIAISON N'EST PAS DOCUMENTÉE.
 *
 * `@cloudflare/workers-types` ne publie pas d'interface pour `quickAction()`,
 * et la documentation se contente d'un exemple qui renvoie le résultat depuis
 * un `fetch` — ce qui suggère une `Response` sans l'affirmer. On accepte donc
 * les trois formes plausibles, et une quatrième LÈVE en la décrivant : un
 * plantage qui nomme la forme réelle vaut mieux qu'un `undefined` qui voyage
 * jusqu'au base64 et rend une image vide.
 */
describe("octetsDeLaCapture", () => {
  it("lit une Response", async () => {
    expect(await octetsDeLaCapture(new Response(JPEG))).toEqual(JPEG);
  });

  it("lit un ArrayBuffer et une vue d'octets", async () => {
    const tampon = new ArrayBuffer(3);
    new Uint8Array(tampon).set([7, 8, 9]);
    expect(await octetsDeLaCapture(tampon)).toEqual(new Uint8Array([7, 8, 9]));
    expect(await octetsDeLaCapture(new Uint8Array([7, 8, 9]))).toEqual(new Uint8Array([7, 8, 9]));
    // Une vue décalée : on ne doit pas relire tout le tampon sous-jacent.
    const grand = new Uint8Array([1, 2, 3, 4, 5]);
    expect(await octetsDeLaCapture(new Uint8Array(grand.buffer, 1, 2))).toEqual(
      new Uint8Array([2, 3]),
    );
  });

  it("transforme une Response en échec quand elle n'est pas ok", async () => {
    await expect(octetsDeLaCapture(new Response("non", { status: 502 }))).rejects.toThrow(
      /502/,
    );
  });

  /**
   * LE CORPS EST LA SEULE CHOSE QUI DIT *QUOI* EST REFUSÉ.
   *
   * Un « Browser Run a répondu 400 » nu a coûté une enquête entière, alors
   * que le service nommait le champ fautif dans un corps que ce code jetait.
   */
  it("rapporte le motif du refus, pas seulement le code", async () => {
    await expect(
      octetsDeLaCapture(
        new Response('{"errors":[{"message":"waitForSelector must be an object"}]}', {
          status: 400,
        }),
      ),
    ).rejects.toThrow(/waitForSelector must be an object/);
  });

  it("tronque un corps bavard sans perdre le code", async () => {
    const bavard = "x".repeat(5_000);
    await expect(octetsDeLaCapture(new Response(bavard, { status: 400 }))).rejects.toThrow(
      /^Browser Run a répondu 400 : x{400}…\.$/,
    );
  });

  /**
   * Un corps illisible ne doit pas remplacer le code d'état par une erreur de
   * lecture : on perdrait la seule information dont on était sûr.
   */
  it("garde le code quand le corps est illisible", async () => {
    const reponse = new Response("peu importe", { status: 403 });
    await reponse.text(); // corps déjà consommé
    await expect(octetsDeLaCapture(reponse)).rejects.toThrow(/403/);
  });

  it("LÈVE en décrivant une forme qu'on ne sait pas lire", async () => {
    for (const inattendu of [null, undefined, 42, "data:image/jpeg;base64,AAA", { url: "x" }]) {
      await expect(octetsDeLaCapture(inattendu), String(inattendu)).rejects.toThrow(
        /Forme inattendue/,
      );
    }
  });
});

describe("capturer", () => {
  const navigateur = (resultat: unknown): LiaisonNavigateur => ({
    quickAction: vi.fn().mockResolvedValue(resultat),
  });

  const biscuit = {
    name: "netereka_apercu",
    value: "v",
    domain: "netereka.ci",
    path: "/apercu/banniere/rev-1",
  };

  it("demande le bon écran, en JPEG, et pose le cookie de laissez-passer", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://netereka.ci/apercu/banniere/rev-1", "mobile", [biscuit], false, "[data-apercu-revision=\"rev-1\"]");
    const options = vi.mocked(nav.quickAction).mock.calls[0][1];
    expect(options.viewport).toEqual({ ...ECRANS.mobile, deviceScaleFactor: 1 });
    expect(options.screenshotOptions?.type).toBe("jpeg");
    expect(options.cookies).toEqual([biscuit]);
    expect(options.url).toContain("/apercu/banniere/rev-1");
  });

  /**
   * UN COOKIE, ET PAS UN EN-TÊTE.
   *
   * La première version posait `setExtraHTTPHeaders` — et un en-tête
   * supplémentaire part avec TOUTES les requêtes de la page, pas au seul
   * document. La page d'aperçu hérite du gabarit vitrine : elle demande ses
   * images à `r2.netereka.ci`, et chargerait Google Tag Manager dès qu'un
   * identifiant GA serait configuré. Le laissez-passer serait parti chez un
   * tiers. Ce test interdit le retour en arrière.
   */
  it("n'envoie JAMAIS le laissez-passer en en-tête", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://netereka.ci/apercu/banniere/rev-1", "mobile", [biscuit], false, "[data-apercu-revision=\"rev-1\"]");
    const options = vi.mocked(nav.quickAction).mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(options.setExtraHTTPHeaders).toBeUndefined();
    expect(JSON.stringify(options)).not.toContain("x-netereka-apercu");
  });

  // `load` partirait avant les images : la vitrine les charge par
  // `next/image`, donc après. On photographierait la page sans ce qu'on vient
  // justement regarder.
  it("attend le silence réseau, pas le simple chargement", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://x.test/a", "bureau", [], false, "[data-x]");
    expect(vi.mocked(nav.quickAction).mock.calls[0][1].gotoOptions?.waitUntil).toBe("networkidle0");
  });

  it("rend les dimensions de l'écran demandé", async () => {
    const c = await capturer(navigateur(new Response(JPEG)), "https://x.test/a", "bureau", [], true, "[data-x]");
    expect(c).toMatchObject({ ecran: "bureau", largeur: 1440, hauteur: 900 });
    expect(c.octets).toEqual(JPEG);
  });

  // Une image vide serait rendue au modèle comme un bloc image valide, et il
  // décrirait un écran noir comme s'il l'avait vu.
  it("refuse une image vide", async () => {
    await expect(
      capturer(navigateur(new Response(new Uint8Array())), "https://x.test/a", "mobile", [], false, "[data-x]"),
    ).rejects.toThrow(EchecDeCapture);
  });

  it("refuse une capture au-delà du plafond, en nommant le recours", async () => {
    const trop = new Uint8Array(CAPTURE_MAX_OCTETS + 1);
    await expect(
      capturer(navigateur(new Response(trop)), "https://x.test/a", "bureau", [], true, "[data-x]"),
    ).rejects.toThrow(/pleine_page/);
    await expect(
      capturer(navigateur(new Response(trop)), "https://x.test/a", "bureau", [], false, "[data-x]"),
    ).rejects.toThrow(/à la main/);
  });

  /**
   * L'ORDRE DES CLÉS EST PORTEUR : la liste d'écrans par défaut de
   * `apercu_revision` vient de `Object.keys(ECRANS)`, donc le mobile d'abord.
   * (La version précédente de ce test comparait aussi les deux largeurs —
   * une assertion creuse, qui ne faisait que relire les constantes.)
   */
  it("l'ordre des écrans est mobile puis bureau", () => {
    expect(Object.keys(ECRANS)).toEqual(["mobile", "bureau"]);
  });

  /**
   * LE MARQUEUR EST LA SEULE CHOSE QUI DISTINGUE L'APERÇU D'UNE AUTRE PAGE.
   *
   * Sans lui, un laissez-passer refusé fait rediriger la page vers la
   * connexion, Browser Run suit la redirection, et rend un JPEG valide et
   * crédible — celui de la page de connexion. Aucun contrôle de taille ne
   * voit cela.
   */
  it("exige le marqueur de la page d'aperçu", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://x.test/a", "mobile", [], false, '[data-apercu-revision="rev-9"]');
    expect(vi.mocked(nav.quickAction).mock.calls[0][1].waitForSelector?.selector).toBe(
      '[data-apercu-revision="rev-9"]',
    );
  });

  /**
   * LA FORME DU CHAMP, ET NON SEULEMENT SA VALEUR.
   *
   * Ce test existe parce que son absence a coûté une version entière : le
   * code passait ici une simple CHAÎNE, le service a répondu 400 à chaque
   * appel, et l'outil n'a jamais rendu une image. L'ancien test affirmait la
   * chaîne — il encodait l'erreur et restait vert.
   *
   * Aucun test local ne peut prouver que le service ACCEPTE cette forme :
   * seul un appel réel le dit, et il l'a dit. Ce que ce test empêche, c'est
   * le retour en arrière.
   */
  it("passe le sélecteur en OBJET, avec son propre délai", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://x.test/a", "mobile", [], false, "[data-x]");
    const attendu = vi.mocked(nav.quickAction).mock.calls[0][1].waitForSelector;
    expect(typeof attendu).toBe("object");
    expect(attendu).toEqual({ selector: "[data-x]", timeout: expect.any(Number) });
    // Il s'ajoute au délai de navigation : sous le plafond de 60 s du service.
    expect(attendu?.timeout).toBeGreaterThan(0);
    expect(attendu?.timeout).toBeLessThanOrEqual(60_000);
  });
});
