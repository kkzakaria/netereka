import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getEnv: vi.fn() }));
vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));

import {
  SOURCE_MAX_BYTES,
  XAI_IMAGE_MODEL,
  editProductImage,
  encodeSourceImage,
} from "@/lib/ai/image-generation";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe("encodeSourceImage", () => {
  it("rend une data URI base64 portant le type de l'objet R2", () => {
    const r = encodeSourceImage(PNG, "image/png", "products/p1/abc.png");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.contentType).toBe("image/png");
      expect(r.dataUri.startsWith("data:image/png;base64,")).toBe(true);
      expect(r.dataUri.slice("data:image/png;base64,".length)).toBe(Buffer.from(PNG).toString("base64"));
      expect(r.size).toBe(4);
    }
  });

  it("déduit le type de l'extension quand R2 ne porte pas de contentType", () => {
    const r = encodeSourceImage(PNG, null, "products/p1/abc.webp");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.contentType).toBe("image/webp");
  });

  it("refuse un type non pris en charge plutôt que de l'envoyer à xAI", () => {
    const r = encodeSourceImage(PNG, "image/gif", "products/p1/abc.gif");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("bad_content_type");
      expect(r.detail).toContain("image/gif");
    }
  });

  it("refuse un type indéterminable (ni contentType ni extension connue)", () => {
    const r = encodeSourceImage(PNG, null, "products/p1/abc.bin");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
  });

  it("refuse au-delà du plafond, AVANT de construire le corps JSON", () => {
    const big = new Uint8Array(SOURCE_MAX_BYTES + 1);
    const r = encodeSourceImage(big, "image/jpeg", "products/p1/a.jpg");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("too_large");
      expect(r.detail).toMatch(/Ko/);
    }
  });

  it("encode sans RangeError une image de plusieurs mégaoctets (base64 par tranches)", () => {
    const big = new Uint8Array(SOURCE_MAX_BYTES);
    big.fill(0x41);
    const r = encodeSourceImage(big, "image/jpeg", "products/p1/a.jpg");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dataUri.length).toBeGreaterThan(SOURCE_MAX_BYTES);
  });
});

describe("editProductImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k" });
  });

  it("no_api_key quand XAI_API_KEY est absente, SANS appeler xAI", async () => {
    mocks.getEnv.mockResolvedValue({});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const r = await editProductImage({ sourceImage: "data:image/png;base64,AA", prompt: "un décor" });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_api_key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("appelle /v1/images/edits en mode édition : modèle, image source, response_format=url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ url: "https://xai/out.png" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await editProductImage({ sourceImage: "data:image/png;base64,AA", prompt: "sur un bureau en bois" });

    expect(r).toEqual({ ok: true, url: "https://xai/out.png" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // ÉDITION, pas génération libre : le chemin /edits est ce qui garantit
    // que la photo réelle du produit reste la base du visuel.
    expect(url).toBe("https://api.x.ai/v1/images/edits");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer xai-k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(XAI_IMAGE_MODEL);
    expect(body.prompt).toBe("sur un bureau en bois");
    expect(body.image).toEqual({ type: "image_url", url: "data:image/png;base64,AA" });
    expect(body.n).toBe(1);
    // L'URL est demandée explicitement : le base64 contournerait fetch-image.ts.
    expect(body.response_format).toBe("url");
  });

  it("auth_failed sur 401 et 403", async () => {
    for (const status of [401, 403]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
      const r = await editProductImage({ sourceImage: "d", prompt: "p" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("auth_failed");
    }
  });

  it("rate_limited sur 429 — distinct d'un 4xx de refus", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rate_limited");
  });

  it("rejected sur 400, avec le détail de xAI borné à 200 caractères", async () => {
    const long = "x".repeat(500);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(long, { status: 400 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("rejected");
      expect(r.detail!.length).toBeLessThanOrEqual(201);
      expect(r.detail!.endsWith("…")).toBe(true);
    }
  });

  it("rejected porte au moins le statut quand le corps est vide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 422 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toBe("HTTP 422");
  });

  it("upstream_error sur 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("upstream_error");
  });

  it("parse_failed sur un 200 non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("parse_failed");
  });

  // Le cœur du § 4.2 : pas de second chemin de téléversement vers R2.
  it("b64_not_supported quand xAI répond en base64 — PAS de décodage ici", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [{ b64_json: "QUJD" }] })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("b64_not_supported");
  });

  it("no_image quand data est vide ou sans url exploitable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const body of [{ data: [] }, {}, { data: [{ url: "" }] }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(body)));
      const r = await editProductImage({ sourceImage: "d", prompt: "p" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("no_image");
    }
  });

  it("timeout quand la requête est interrompue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    }));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timeout");
  });

  it("fetch_failed sur une panne réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("fetch_failed");
  });

  it("ne télécharge pas le résultat : il rend l'URL, un seul appel sortant", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ url: "https://xai/out.png" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
