import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

vi.stubGlobal("fetch", mocks.fetch);

import { searchProductSpecs, searchProductImages } from "@/lib/ai/search";

// ─── Env fixtures ─────────────────────────────────────────────────────────────

const BRAVE_ONLY = { env: { BRAVE_SEARCH_API_KEY: "brave-key" } };
const GOOGLE_ONLY = {
  env: {
    GOOGLE_SEARCH_API_KEY: "google-key",
    GOOGLE_SEARCH_ENGINE_ID: "cx-123",
  },
};
const BOTH = {
  env: {
    BRAVE_SEARCH_API_KEY: "brave-key",
    GOOGLE_SEARCH_API_KEY: "google-key",
    GOOGLE_SEARCH_ENGINE_ID: "cx-123",
  },
};
const NONE = { env: {} };

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  mocks.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function mockFetchStatus(status: number) {
  mocks.fetch.mockResolvedValue({ ok: false, status });
}

const BRAVE_BODY = {
  web: {
    results: [
      { title: "Galaxy S24 Ultra", description: "Snapdragon 8 Gen 3, 12 Go RAM" },
    ],
  },
};

const GOOGLE_BODY = {
  items: [
    { title: "Galaxy S24 Ultra", snippet: "Snapdragon 8 Gen 3, écran 6.8 pouces" },
  ],
};

// ─── No API keys ──────────────────────────────────────────────────────────────

describe("searchProductSpecs — no API keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(NONE);
  });

  it("returns empty string and does not call fetch", async () => {
    const result = await searchProductSpecs("Samsung Galaxy S24");
    expect(result).toBe("");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

// ─── Brave only — success ─────────────────────────────────────────────────────

describe("searchProductSpecs — Brave only, success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
  });

  it("returns snippets from Brave on success", async () => {
    mockFetchOk(BRAVE_BODY);
    const result = await searchProductSpecs("Galaxy S24 Ultra");
    expect(result).toBe("Galaxy S24 Ultra — Snapdragon 8 Gen 3, 12 Go RAM");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0]).toContain("search.brave.com");
  });

  it("appends search suffix to query", async () => {
    mockFetchOk(BRAVE_BODY);
    await searchProductSpecs("iPhone 15");
    const url = mocks.fetch.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent("specifications fiche technique"));
  });
});

// ─── Brave only — HTTP errors ─────────────────────────────────────────────────

describe("searchProductSpecs — Brave only, HTTP errors (no Google fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
  });

  it.each([401, 403, 429, 500, 503])(
    "returns empty string on Brave HTTP %i when no Google key",
    async (status) => {
      mockFetchStatus(status);
      expect(await searchProductSpecs("query")).toBe("");
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    }
  );

  it("returns empty string when Brave body is non-JSON", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError("bad json"); },
    });
    expect(await searchProductSpecs("query")).toBe("");
  });

  it("returns empty string when Brave results array is empty", async () => {
    mockFetchOk({ web: { results: [] } });
    expect(await searchProductSpecs("query")).toBe("");
  });
});

// ─── Brave + Google — Brave fails → Google succeeds ──────────────────────────

describe("searchProductSpecs — Brave fails, Google fallback succeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(BOTH);
  });

  it("uses Google when Brave returns a non-OK status", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => GOOGLE_BODY });

    const result = await searchProductSpecs("Galaxy S24 Ultra");
    expect(result).toBe("Galaxy S24 Ultra — Snapdragon 8 Gen 3, écran 6.8 pouces");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls[1][0]).toContain("googleapis.com");
  });

  it("uses Google when Brave returns empty results", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ web: { results: [] } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => GOOGLE_BODY });

    const result = await searchProductSpecs("query");
    expect(result).toContain("Snapdragon");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses Google when Brave fetch throws (network error)", async () => {
    mocks.fetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => GOOGLE_BODY });

    const result = await searchProductSpecs("Galaxy S24 Ultra");
    expect(result).toContain("Snapdragon");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses Google when Brave fetch times out", async () => {
    mocks.fetch
      .mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => GOOGLE_BODY });

    const result = await searchProductSpecs("query");
    expect(result).toContain("Snapdragon");
  });
});

// ─── Google only — success ────────────────────────────────────────────────────

describe("searchProductSpecs — Google only (no Brave key)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(GOOGLE_ONLY);
  });

  it("skips Brave and calls Google directly", async () => {
    mockFetchOk(GOOGLE_BODY);
    const result = await searchProductSpecs("Galaxy S24 Ultra");
    expect(result).toBe("Galaxy S24 Ultra — Snapdragon 8 Gen 3, écran 6.8 pouces");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0]).toContain("googleapis.com");
  });

  it("passes cx and key in the Google URL", async () => {
    mockFetchOk(GOOGLE_BODY);
    await searchProductSpecs("query");
    const url = mocks.fetch.mock.calls[0][0] as string;
    expect(url).toContain("key=google-key");
    expect(url).toContain("cx=cx-123");
  });
});

// ─── Both fail ────────────────────────────────────────────────────────────────

describe("searchProductSpecs — both Brave and Google fail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(BOTH);
  });

  it("returns empty string when both APIs fail", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await searchProductSpecs("query")).toBe("");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("returns empty string when both throw", async () => {
    mocks.fetch.mockRejectedValue(new TypeError("network down"));
    expect(await searchProductSpecs("query")).toBe("");
  });
});

// ─── Snippet formatting ───────────────────────────────────────────────────────

describe("searchProductSpecs — snippet formatting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
  });

  it("slices results to a maximum of 3", async () => {
    mockFetchOk({
      web: {
        results: [
          { title: "A", description: "1" },
          { title: "B", description: "2" },
          { title: "C", description: "3" },
          { title: "D", description: "4" },
        ],
      },
    });
    const result = await searchProductSpecs("query");
    expect(result.split("\n")).toHaveLength(3);
    expect(result).not.toContain("D");
  });

  it("truncates combined snippets to 1000 characters", async () => {
    const longDesc = "x".repeat(600);
    mockFetchOk({
      web: {
        results: [
          { title: "A", description: longDesc },
          { title: "B", description: longDesc },
        ],
      },
    });
    const result = await searchProductSpecs("query");
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it("includes result with only a title when description is absent", async () => {
    mockFetchOk({ web: { results: [{ title: "Galaxy S24" }] } });
    expect(await searchProductSpecs("query")).toBe("Galaxy S24");
  });
});

// ─── searchProductImages ────────────────────────────────────────────────────

describe("searchProductImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns image URLs from Brave Image Search when key is set", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { thumbnail: { src: "https://cdn.example.com/img1.jpg" } },
          { thumbnail: { src: "https://cdn.example.com/img2.jpg" } },
        ],
      }),
    });

    const urls = await searchProductImages("iPhone 16 Pro");
    expect(urls).toEqual([
      "https://cdn.example.com/img1.jpg",
      "https://cdn.example.com/img2.jpg",
    ]);
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/images/search"),
      expect.any(Object)
    );
  });

  it("returns empty array when no API key is configured", async () => {
    mocks.getCloudflareContext.mockResolvedValue(NONE);
    const urls = await searchProductImages("iPhone 16 Pro");
    expect(urls).toEqual([]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("returns empty array when Brave Image Search returns non-ok status", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({ ok: false, status: 403 });
    const urls = await searchProductImages("test");
    expect(urls).toEqual([]);
  });

  it("returns empty array when Brave Image Search returns no results", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    const urls = await searchProductImages("test");
    expect(urls).toEqual([]);
  });

  it("returns empty array on fetch timeout/network error", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockRejectedValue(new Error("timeout"));
    const urls = await searchProductImages("test");
    expect(urls).toEqual([]);
  });

  it("filters out results with no thumbnail src", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { thumbnail: { src: "https://cdn.example.com/img1.jpg" } },
          { thumbnail: {} },
          { thumbnail: { src: "https://cdn.example.com/img3.jpg" } },
        ],
      }),
    });
    const urls = await searchProductImages("test");
    expect(urls).toEqual([
      "https://cdn.example.com/img1.jpg",
      "https://cdn.example.com/img3.jpg",
    ]);
  });

  it("returns at most 3 URLs when results contain more", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { thumbnail: { src: "https://cdn.example.com/img1.jpg" } },
          { thumbnail: { src: "https://cdn.example.com/img2.jpg" } },
          { thumbnail: { src: "https://cdn.example.com/img3.jpg" } },
          { thumbnail: { src: "https://cdn.example.com/img4.jpg" } },
        ],
      }),
    });
    const urls = await searchProductImages("test");
    expect(urls).toHaveLength(3);
    expect(urls).not.toContain("https://cdn.example.com/img4.jpg");
  });
});
