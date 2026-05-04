import { describe, expect, it, vi, beforeEach } from "vitest";
import { searchImages } from "@/lib/ai/image-search";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("searchImages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne no_api_key quand la clé est absente", async () => {
    const r = await searchImages({ query: "xx" }, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_api_key");
  });

  it("normalise les résultats Brave et drop les items sans properties.url", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: "Galaxy A55 product photo",
            url: "https://samsung.com/page",
            source: "samsung.com",
            thumbnail: { src: "https://imgs.search.brave.com/abc.jpg" },
            properties: { url: "https://samsung.com/galaxy-a55-product.jpg" },
          },
          {
            // DROPPED: properties.url missing — top-level url is the hosting
            // HTML page (per Brave docs), not a direct image URL. Feeding it
            // to image_candidates would 404 on bad_content_type.
            title: "Hands-on review",
            url: "https://theverge.com/article",
            source: "theverge.com",
          },
          {
            // DROPPED: no usable URL at all
            title: "broken",
          },
        ],
      }),
    ));

    const r = await searchImages({ query: "Galaxy A55" }, "test-key");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toHaveLength(1);
      expect(r.results[0]).toEqual({
        url: "https://samsung.com/galaxy-a55-product.jpg",
        source_domain: "samsung.com",
        title: "Galaxy A55 product photo",
        thumbnail_url: "https://imgs.search.brave.com/abc.jpg",
      });
    }
  });

  it("utilise hostname extrait de l'URL quand source est absent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: "Press shot",
            properties: { url: "https://news.samsung.com/global/foo.jpg" },
            // no `source` field
          },
        ],
      }),
    ));
    const r = await searchImages({ query: "xx" }, "k");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.results[0].source_domain).toBe("news.samsung.com");
  });

  it("drop l'item quand l'URL est non-parseable et source manquant", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({
        results: [{ properties: { url: "not a url" }, title: "junk" }],
      }),
    ));
    const r = await searchImages({ query: "xx" }, "k");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.results).toHaveLength(0);
  });

  it("envoie le header X-Subscription-Token et la query encodée", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchImages({ query: "iPhone 15", count: 5 }, "secret-key");

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=iPhone+15");
    expect(calledUrl).toContain("count=5");
    expect(calledUrl).toContain("safesearch=strict");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-subscription-token"]).toBe("secret-key");
  });

  it("clampe count entre 1 et 20", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchImages({ query: "xx", count: 999 }, "k");
    expect(fetchMock.mock.calls[0][0] as string).toContain("count=20");

    await searchImages({ query: "xx", count: 0 }, "k");
    expect(fetchMock.mock.calls[1][0] as string).toContain("count=1");
  });

  it("retourne auth_failed pour 401/403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    const r = await searchImages({ query: "xx" }, "bad-key");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("auth_failed");
  });

  it("retourne rate_limited pour 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("slow down", { status: 429 })));
    const r = await searchImages({ query: "xx" }, "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rate_limited");
  });

  it("retourne upstream_error pour 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 503 })));
    const r = await searchImages({ query: "xx" }, "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("upstream_error");
  });

  it("retourne invalid_input pour query absente ou trop courte", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await searchImages({} as never, "k")).ok).toBe(false);
    expect((await searchImages({ query: "" }, "k")).ok).toBe(false);
    expect((await searchImages({ query: " " }, "k")).ok).toBe(false);
    expect((await searchImages({ query: 42 as never }, "k")).ok).toBe(false);
    // Aucun appel réseau ne doit avoir lieu — la garde côté input court-circuite.
    expect(fetchMock).not.toHaveBeenCalled();
    const r = await searchImages({ query: "" }, "k");
    if (!r.ok) expect(r.reason).toBe("invalid_input");
  });

  it("retourne parse_failed pour un body 200 non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }),
    ));
    const r = await searchImages({ query: "xx" }, "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("parse_failed");
  });

  it("warn quand Brave 200 OK mais results manquant (schema drift)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ unexpected: "shape" })));
    const r = await searchImages({ query: "xx" }, "k");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.results).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("schema drift"),
      expect.objectContaining({ keys: ["unexpected"] }),
    );
    warnSpy.mockRestore();
  });

  it("utilise count=10 par défaut", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await searchImages({ query: "xx" }, "k");
    expect(fetchMock.mock.calls[0][0] as string).toContain("count=10");
  });

  it("retourne timeout quand fetch est aborted", async () => {
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    const r = await searchImages({ query: "xx" }, "k", { timeoutMs: 100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timeout");
  });
});
