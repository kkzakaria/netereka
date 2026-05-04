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
    const r = await searchImages({ query: "x" }, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_api_key");
  });

  it("normalise les résultats Brave (properties.url + thumbnail.src)", async () => {
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
            // missing properties.url falls back to top-level url
            title: "Hands-on review",
            url: "https://theverge.com/img.jpg",
            source: "theverge.com",
            thumbnail: { src: "https://imgs.search.brave.com/def.jpg" },
          },
          {
            // dropped: no usable URL at all
            title: "broken",
          },
        ],
      }),
    ));

    const r = await searchImages({ query: "Galaxy A55" }, "test-key");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toHaveLength(2);
      expect(r.results[0]).toEqual({
        url: "https://samsung.com/galaxy-a55-product.jpg",
        source_domain: "samsung.com",
        title: "Galaxy A55 product photo",
        thumbnail_url: "https://imgs.search.brave.com/abc.jpg",
      });
      expect(r.results[1].source_domain).toBe("theverge.com");
    }
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

    await searchImages({ query: "x", count: 999 }, "k");
    expect(fetchMock.mock.calls[0][0] as string).toContain("count=20");

    await searchImages({ query: "x", count: 0 }, "k");
    expect(fetchMock.mock.calls[1][0] as string).toContain("count=1");
  });

  it("retourne auth_failed pour 401/403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    const r = await searchImages({ query: "x" }, "bad-key");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("auth_failed");
  });

  it("retourne rate_limited pour 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("slow down", { status: 429 })));
    const r = await searchImages({ query: "x" }, "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rate_limited");
  });

  it("retourne upstream_error pour 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 503 })));
    const r = await searchImages({ query: "x" }, "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("upstream_error");
  });

  it("retourne timeout quand fetch est aborted", async () => {
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    const r = await searchImages({ query: "x" }, "k", { timeoutMs: 100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timeout");
  });
});
