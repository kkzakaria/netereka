import { describe, expect, it, vi, beforeEach } from "vitest";

const { uploadToR2Mock } = vi.hoisted(() => ({ uploadToR2Mock: vi.fn() }));
vi.mock("@/lib/storage/images", () => ({ uploadToR2: uploadToR2Mock }));

import { fetchAndUploadImage, isBlockedHost, IMAGE_MAX_BYTES } from "@/lib/storage/fetch-image";

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
