import { describe, expect, it, vi, beforeEach } from "vitest";

const { uploadToR2Mock } = vi.hoisted(() => ({ uploadToR2Mock: vi.fn() }));
vi.mock("@/lib/storage/images", () => ({ uploadToR2: uploadToR2Mock }));

import { fetchAndUploadImage, IMAGE_MAX_BYTES } from "@/lib/ai/image-fetch";

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
});
