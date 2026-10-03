import { describe, expect, it, vi, beforeEach } from "vitest";

const { uploadToR2Mock } = vi.hoisted(() => ({ uploadToR2Mock: vi.fn() }));
vi.mock("@/lib/storage/images", () => ({ uploadToR2: uploadToR2Mock }));

import { fetchAndUploadImage, isBlockedHost, IMAGE_MAX_BYTES, ALLOWED_IMAGE_TYPES, extensionPour } from "@/lib/storage/fetch-image";

function makeImageResponse(opts: {
  ok?: boolean;
  status?: number;
  contentType?: string;
  body?: Uint8Array;
} = {}) {
  const body = opts.body ?? new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header-ish
  return new Response(body as BodyInit, {
    status: opts.status ?? 200,
    headers: { "content-type": opts.contentType ?? "image/png" },
  });
}

describe("fetchAndUploadImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejette URL localhost (SSRF)", async () => {
    const r = await fetchAndUploadImage("draft-1", "http://127.0.0.1/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
  });

  it("rejette les IPs privées RFC1918", async () => {
    const r = await fetchAndUploadImage("draft-1", "http://10.0.0.1/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
  });

  it("rejette les schemas non-http", async () => {
    const r = await fetchAndUploadImage("draft-1", "file:///etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
  });

  it("inclut le status HTTP dans bad_status (404 vs 403)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("not found", { status: 404, headers: { "content-type": "image/png" } }),
    ));
    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("bad_status");
      expect(r.status).toBe(404);
    }
  });

  it("rejette les content-types non-image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makeImageResponse({ contentType: "text/html" }),
    ));
    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
  });

  /**
   * Trois images d'une fiche publiée ne s'affichaient pas le 2026-10-02 :
   * « ERROR 9520: Original image has unsupported format ». Les sources étaient
   * des .png et un .jpg ; l'outil avait stocké des .avif, parce que notre
   * en-tête Accept annonçait l'AVIF en premier choix et que honor.com a négocié
   * le contenu. Or la vitrine sert tout par /cdn-cgi/image/, et Cloudflare ne
   * lit l'AVIF en entrée que sur un plan Enterprise.
   *
   * Aucun test ne couvrait ce format, ni pour l'accepter ni pour le refuser :
   * la restriction est passée au vert sans rien prouver tant que ces deux
   * tests n'existaient pas.
   */
  it("refuse un AVIF : la vitrine ne saurait pas le rendre", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makeImageResponse({ contentType: "image/avif" }),
    ));
    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
  });

  // Le refus ne sert à rien si on continue de RÉCLAMER le format : un CDN qui
  // négocie le contenu nous le servirait, et chaque image d'une telle source
  // échouerait au lieu d'être téléchargée. Les deux moitiés vont ensemble.
  it("ne réclame pas l'AVIF dans son en-tête Accept", async () => {
    const f = vi.fn().mockResolvedValue(makeImageResponse({}));
    vi.stubGlobal("fetch", f);
    await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    const init = f.mock.calls[0][1] as { headers: Record<string, string> };
    const accept = init.headers.accept;
    expect(accept).not.toContain("avif");
    // Et le WebP reste demandé : le redimensionneur le lit sur tous les plans.
    expect(accept).toContain("image/webp");
  });

  /**
   * Certaines origines servent de l'AVIF quel que soit l'`Accept`. Plutôt que
   * de renoncer — ou de décoder nous-mêmes, ce qui exigerait un décodeur AVIF
   * en WebAssembly dans le Worker — on redemande en n'annonçant que des
   * formats anciens : c'est l'origine qui convertit, elle a l'original.
   */
  it("redemande en JPEG/PNG quand l'origine sert un AVIF malgré tout", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(makeImageResponse({ contentType: "image/avif" }))
      .mockResolvedValueOnce(makeImageResponse({ contentType: "image/jpeg" }));
    vi.stubGlobal("fetch", f);

    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(r.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
    // Le second essai n'annonce plus que des formats anciens.
    const second = f.mock.calls[1][1] as { headers: Record<string, string> };
    expect(second.headers.accept).toContain("image/jpeg");
    expect(second.headers.accept).not.toContain("webp");
  });

  // Une origine qui sert de l'AVIF quoi qu'on demande : on renonce proprement
  // plutôt que de boucler. UN seul second essai.
  it("ne réessaie qu'une fois : un AVIF obstiné est refusé", async () => {
    const f = vi.fn().mockResolvedValue(makeImageResponse({ contentType: "image/avif" }));
    vi.stubGlobal("fetch", f);

    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
    expect(f).toHaveBeenCalledTimes(2);
  });

  /**
   * RÉGRESSION : le second essai vivait hors du try/catch qui normalise les
   * erreurs, donc `fetchAndUploadImage` LEVAIT au lieu de rendre un résultat
   * typé — alors qu'elle rendait toujours un résultat jusque-là.
   *
   * Le cas n'est pas théorique : le délai et l'AbortController sont PARTAGÉS
   * entre les deux appels. Une origine lente qui consomme la fenêtre au premier
   * fait avorter le second presque aussitôt.
   *
   * Ses appelants travaillent en `Promise.all` : un seul rejet aurait perdu
   * tout un lot d'images déjà écrites en R2.
   */
  it("un second essai interrompu rend un timeout typé, il ne lève pas", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const f = vi.fn()
      .mockResolvedValueOnce(makeImageResponse({ contentType: "image/avif" }))
      .mockRejectedValueOnce(abort);
    vi.stubGlobal("fetch", f);

    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timeout");
  });

  it("une panne réseau au second essai retombe sur un refus typé", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(makeImageResponse({ contentType: "image/avif" }))
      .mockRejectedValueOnce(new TypeError("network boom"));
    vi.stubGlobal("fetch", f);

    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(r.ok).toBe(false);
    // On garde la réponse AVIF initiale : c'est bien le TYPE qui est refusé.
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
  });

  // Le second essai ne doit pas se déclencher pour un type simplement
  // inconnu : seul l'AVIF a une origine capable de le convertir à la demande.
  it("ne réessaie pas pour un content-type qui n'est pas une image", async () => {
    const f = vi.fn().mockResolvedValue(makeImageResponse({ contentType: "text/html" }));
    vi.stubGlobal("fetch", f);

    await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(f).toHaveBeenCalledTimes(1);
  });

  /**
   * Les trois `cancel()` du correctif précédent n'avaient AUCUN test : les
   * supprimer laissait les 1936 au vert. Pire, une sonde a montré qu'ils
   * annulaient le mauvais corps — celui du second essai, pas l'initial, qui
   * fuyait sur les quatre chemins d'échec. Le message de commit affirmait
   * « les corps inutilisés sont annulés » : l'inverse, pour celui qui compte.
   *
   * Sous workerd, une réponse non consommée retient la sous-requête.
   */
  function corpsEspionne(contentType: string) {
    const annule = { fait: false };
    const body = new ReadableStream<Uint8Array>({
      pull(c) { c.enqueue(new Uint8Array([1, 2, 3, 4])); c.close(); },
      cancel() { annule.fait = true; },
    });
    return { resp: new Response(body, { status: 200, headers: { "content-type": contentType } }), annule };
  }

  it("annule le corps initial quand le second essai le remplace", async () => {
    const a = corpsEspionne("image/avif");
    const b = corpsEspionne("image/jpeg");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(a.resp).mockResolvedValueOnce(b.resp));

    await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(a.annule.fait, "le corps AVIF jeté n'a pas été annulé").toBe(true);
    expect(b.annule.fait, "le corps retenu ne doit PAS être annulé").toBe(false);
  });

  it("annule le corps initial quand le second essai échoue aussi", async () => {
    const a = corpsEspionne("image/avif");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(a.resp)
      .mockRejectedValueOnce(new TypeError("network boom")));

    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(r.ok).toBe(false);
    expect(a.annule.fait, "le corps initial fuit sur le chemin d'échec").toBe(true);
  });

  it("annule le corps même sur un refus de type qui n'a rien à voir avec l'AVIF", async () => {
    const a = corpsEspionne("text/html");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(a.resp));

    await fetchAndUploadImage("draft-1", "https://example.test/x.png");

    expect(a.annule.fait).toBe(true);
  });

  // Un `cancel()` qui rejette ne doit pas renverser l'appel : le seul signal
  // perdu serait « ce flux était déjà verrouillé », donc un défaut chez nous.
  it("un cancel qui rejette ne fait pas échouer l'appel", async () => {
    const body = new ReadableStream<Uint8Array>({
      pull(c) { c.enqueue(new Uint8Array([1])); c.close(); },
      cancel() { throw new Error("cancel boom"); },
    });
    const avif = new Response(body, { status: 200, headers: { "content-type": "image/avif" } });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(avif)
      .mockResolvedValueOnce(makeImageResponse({ contentType: "image/jpeg" })));

    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");
    expect(r.ok).toBe(true);
  });

  it("accepte toujours les formats que le redimensionneur sait lire", async () => {
    for (const ct of ["image/png", "image/jpeg", "image/webp"]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse({ contentType: ct })));
      const r = await fetchAndUploadImage("draft-1", "https://example.test/x");
      expect(r.ok, `${ct} refusé à tort`).toBe(true);
    }
  });

  it("rejette si body > 5 MB", async () => {
    const big = new Uint8Array(IMAGE_MAX_BYTES + 1);
    big[0] = 0x89;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse({ body: big })));
    const r = await fetchAndUploadImage("draft-1", "https://example.test/big.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_large");
  });

  it("upload vers R2 pour une image valide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse()));
    uploadToR2Mock.mockResolvedValue("products/draft-1/abc.png");

    const r = await fetchAndUploadImage("draft-1", "https://example.test/a.png");

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.key).toMatch(/^products\/draft-1\/[A-Za-z0-9_-]+\.png$/);
    expect(uploadToR2Mock).toHaveBeenCalledOnce();
  });

  it("renvoie upload_failed si uploadToR2 throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse()));
    uploadToR2Mock.mockRejectedValueOnce(new Error("R2 bucket non disponible"));

    const r = await fetchAndUploadImage("draft-1", "https://example.test/a.png");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("upload_failed");
  });

  it("rejette un redirect vers une IP privée (SSRF via Location header)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: "http://10.0.0.1/evil.png" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchAndUploadImage("draft-1", "https://public.test/a.png");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
    expect(fetchMock).toHaveBeenCalledTimes(1); // second hop never issued
  });

  it("suit un redirect vers une URL publique", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 301,
        headers: { location: "https://cdn.public.test/a.png" },
      }))
      .mockResolvedValueOnce(makeImageResponse());
    vi.stubGlobal("fetch", fetchMock);
    uploadToR2Mock.mockResolvedValue("products/draft-1/abc.png");

    const r = await fetchAndUploadImage("draft-1", "https://origin.test/a.png");
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("abandonne au-delà du cap de redirects", async () => {
    const loopingResp = () => new Response(null, {
      status: 302,
      headers: { location: "https://public.test/next" },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(loopingResp())
      .mockResolvedValueOnce(loopingResp())
      .mockResolvedValueOnce(loopingResp())
      .mockResolvedValueOnce(loopingResp());
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchAndUploadImage("draft-1", "https://public.test/a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("fetch_failed");
  });

  it("envoie un User-Agent navigateur et un Accept image (anti-403)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeImageResponse());
    vi.stubGlobal("fetch", fetchMock);
    uploadToR2Mock.mockResolvedValue("products/draft-1/abc.png");

    await fetchAndUploadImage("draft-1", "https://example.test/a.png");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["user-agent"]).toMatch(/Mozilla\/5\.0/);
    expect(headers["accept"]).toContain("image/");
  });

  it("normalise un AbortError pendant le streaming du body en reason=timeout", async () => {
    // Simulate fetch resolving OK, but reader.read() throwing AbortError mid-stream
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    const bodyStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0x89]));
        controller.error(aborted);
      },
    });
    const resp = new Response(bodyStream, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resp));

    const r = await fetchAndUploadImage("draft-1", "https://public.test/a.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timeout");
  });

  it("rejette un redirect vers une adresse IPv6 non spécifiée (SSRF via Location)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: "http://[::]/evil.png" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchAndUploadImage("draft-1", "https://public.test/a.png");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
    expect(fetchMock).toHaveBeenCalledTimes(1); // second hop never issued
  });

  it("upload une image dont l'hôte est une IP publique en notation décimale (8.8.8.8)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse()));
    uploadToR2Mock.mockResolvedValue("products/draft-1/abc.png");

    const r = await fetchAndUploadImage("draft-1", "https://8.8.8.8/a.png");

    expect(r.ok).toBe(true);
  });
});

/**
 * `isBlockedHost` est testée directement (plutôt qu'en passant systématiquement
 * par `fetchAndUploadImage`) car `new URL(...)` normalise déjà certaines
 * écritures IPv4 exotiques (décimal, octal, hex) en notation pointée
 * canonique avant même d'atteindre la garde — un test de bout en bout sur ces
 * formes-là ne distinguerait donc pas l'ancienne garde de la nouvelle. Les
 * cinq contournements documentés (voir revue PR #312) atteignaient
 * effectivement 127.0.0.1 sous l'ancienne garde ; celle-ci ne rejetait un nom
 * numérique que sous sa forme canonique non rembourrée à quatre octets, et ne
 * reconnaissait que le littéral exact `::1` en IPv6.
 */
/**
 * L'invariant qui rend la levée d'`extensionPour` inatteignable : chaque type
 * accepté a une extension. Il tenait auparavant à une convention entre deux
 * littéraux tenus à la main, que le message d'erreur lui-même décrivait comme
 * pouvant diverger — une garantie énoncée sans garde. La liste est maintenant
 * DÉRIVÉE de la table, donc la divergence est impossible par construction ;
 * ce test le vérifie depuis l'extérieur, sans que la table soit exportée.
 *
 * S'il rougit, c'est que quelqu'un a réécrit la liste à la main.
 */
describe("chaque type accepté a une extension", () => {
  it("extensionPour répond pour tous, et ne rend jamais de chaîne vide", () => {
    expect(ALLOWED_IMAGE_TYPES.size).toBeGreaterThan(0); // pas de comparaison à vide
    for (const ct of ALLOWED_IMAGE_TYPES) {
      const ext = extensionPour(ct);
      expect(ext, `${ct} sans extension`).toBeTruthy();
      expect(ext).toMatch(/^[a-z0-9]{2,5}$/);
    }
  });

  it("et un type hors liste lève, au lieu d'inventer une extension", () => {
    expect(() => extensionPour("image/avif")).toThrow(/divergé/);
  });
});

describe("isBlockedHost", () => {
  it.each([
    ["2130706433", "127.0.0.1 en décimal 32 bits"],
    ["0177.0.0.1", "octet zéro-rembourré lu en octal"],
    ["127.1", "forme courte façon inet_aton"],
    ["0x7f.0.0.1", "octet hexadécimal"],
    ["[::]", "adresse IPv6 non spécifiée"],
    ["[::ffff:127.0.0.1]", "IPv6 mappée IPv4 vers le loopback"],
  ])("bloque le contournement %s (%s)", (host) => {
    expect(isBlockedHost(host)).toBe(true);
  });

  it.each([
    "cdn.apple.com",
    "images.samsung.com",
    "8.8.8.8",
    "1.2.3.4",
    "cdn1.example.com",
    "[2606:4700::1111]",
  ])("laisse passer l'hôte légitime %s", (host) => {
    expect(isBlockedHost(host)).toBe(false);
  });
});
