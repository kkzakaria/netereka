import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

vi.stubGlobal("fetch", mocks.fetch);

import { searchProductSpecs } from "@/lib/ai/search";

const withKey = { env: { BRAVE_SEARCH_API_KEY: "test-key" } };
const withoutKey = { env: {} };

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

// ─── Key absent ───────────────────────────────────────────────────────────────

describe("searchProductSpecs — no API key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(withoutKey);
  });

  it("returns empty string and does not call fetch when key is absent", async () => {
    const result = await searchProductSpecs("Samsung Galaxy S24");
    expect(result).toBe("");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

// ─── Non-OK HTTP responses ────────────────────────────────────────────────────

describe("searchProductSpecs — HTTP errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(withKey);
  });

  it.each([401, 403, 429, 500, 503])(
    "returns empty string on HTTP %i",
    async (status) => {
      mockFetchStatus(status);
      expect(await searchProductSpecs("query")).toBe("");
    }
  );
});

// ─── Malformed response body ──────────────────────────────────────────────────

describe("searchProductSpecs — malformed body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(withKey);
  });

  it("returns empty string when response body is not valid JSON", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON at position 0");
      },
    });
    expect(await searchProductSpecs("query")).toBe("");
  });
});

// ─── Empty / missing results ──────────────────────────────────────────────────

describe("searchProductSpecs — empty results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(withKey);
  });

  it("returns empty string when web key is absent", async () => {
    mockFetchOk({});
    expect(await searchProductSpecs("query")).toBe("");
  });

  it("returns empty string when results array is absent", async () => {
    mockFetchOk({ web: {} });
    expect(await searchProductSpecs("query")).toBe("");
  });

  it("returns empty string when results array is empty", async () => {
    mockFetchOk({ web: { results: [] } });
    expect(await searchProductSpecs("query")).toBe("");
  });
});

// ─── Snippet formatting ───────────────────────────────────────────────────────

describe("searchProductSpecs — snippet formatting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(withKey);
  });

  it("joins title and description with em-dash separator", async () => {
    mockFetchOk({
      web: {
        results: [{ title: "Samsung Galaxy S24", description: "Snapdragon 8 Gen 3" }],
      },
    });
    const result = await searchProductSpecs("query");
    expect(result).toBe("Samsung Galaxy S24 — Snapdragon 8 Gen 3");
  });

  it("includes result with only a title when description is absent", async () => {
    mockFetchOk({ web: { results: [{ title: "Galaxy S24" }] } });
    expect(await searchProductSpecs("query")).toBe("Galaxy S24");
  });

  it("includes result with only a description when title is absent", async () => {
    mockFetchOk({ web: { results: [{ description: "Snapdragon chip" }] } });
    expect(await searchProductSpecs("query")).toBe("Snapdragon chip");
  });

  it("slices results to a maximum of 3", async () => {
    mockFetchOk({
      web: {
        results: [
          { title: "A", description: "1" },
          { title: "B", description: "2" },
          { title: "C", description: "3" },
          { title: "D", description: "4" },
          { title: "E", description: "5" },
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
});

// ─── Fetch error propagation ──────────────────────────────────────────────────

describe("searchProductSpecs — fetch errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCloudflareContext.mockResolvedValue(withKey);
  });

  it("propagates network errors to the caller", async () => {
    mocks.fetch.mockRejectedValue(new TypeError("fetch failed"));
    await expect(searchProductSpecs("query")).rejects.toThrow("fetch failed");
  });

  it("propagates AbortError on timeout to the caller", async () => {
    mocks.fetch.mockRejectedValue(
      new DOMException("The operation was aborted", "AbortError")
    );
    await expect(searchProductSpecs("query")).rejects.toThrow("The operation was aborted");
  });
});
