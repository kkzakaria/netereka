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

  it("demande le bon écran, en JPEG, et pose l'en-tête de laissez-passer", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://netereka.ci/apercu/banniere/rev-1", "mobile", { "x-a": "b" }, false);
    const options = vi.mocked(nav.quickAction).mock.calls[0][1];
    expect(options.viewport).toEqual({ ...ECRANS.mobile, deviceScaleFactor: 1 });
    expect(options.screenshotOptions?.type).toBe("jpeg");
    expect(options.setExtraHTTPHeaders).toEqual({ "x-a": "b" });
    expect(options.url).toContain("/apercu/banniere/rev-1");
  });

  // `load` partirait avant les images : la vitrine les charge par
  // `next/image`, donc après. On photographierait la page sans ce qu'on vient
  // justement regarder.
  it("attend le silence réseau, pas le simple chargement", async () => {
    const nav = navigateur(new Response(JPEG));
    await capturer(nav, "https://x.test/a", "bureau", {}, false);
    expect(vi.mocked(nav.quickAction).mock.calls[0][1].gotoOptions?.waitUntil).toBe("networkidle0");
  });

  it("rend les dimensions de l'écran demandé", async () => {
    const c = await capturer(navigateur(new Response(JPEG)), "https://x.test/a", "bureau", {}, true);
    expect(c).toMatchObject({ ecran: "bureau", largeur: 1440, hauteur: 900 });
    expect(c.octets).toEqual(JPEG);
  });

  // Une image vide serait rendue au modèle comme un bloc image valide, et il
  // décrirait un écran noir comme s'il l'avait vu.
  it("refuse une image vide", async () => {
    await expect(
      capturer(navigateur(new Response(new Uint8Array())), "https://x.test/a", "mobile", {}, false),
    ).rejects.toThrow(EchecDeCapture);
  });

  it("refuse une capture au-delà du plafond, en nommant le recours", async () => {
    const trop = new Uint8Array(CAPTURE_MAX_OCTETS + 1);
    await expect(
      capturer(navigateur(new Response(trop)), "https://x.test/a", "bureau", {}, true),
    ).rejects.toThrow(/pleine_page/);
    await expect(
      capturer(navigateur(new Response(trop)), "https://x.test/a", "bureau", {}, false),
    ).rejects.toThrow(/à la main/);
  });

  it("les deux écrans sont ceux sur lesquels on juge vraiment", () => {
    expect(ECRANS.mobile.width).toBeLessThan(ECRANS.bureau.width);
    expect(Object.keys(ECRANS)).toEqual(["mobile", "bureau"]);
  });
});
