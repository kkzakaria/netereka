import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { callTextModel, OpenRouterApiError, TEXT_MODEL } from "@/lib/ai";

// ─── Env fixtures ─────────────────────────────────────────────────────────────

const ENV_WITH_KEY = { env: { OPENROUTER_API_KEY: "sk-or-test-key" } };
const ENV_NO_KEY = { env: {} };

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

function mockFetchOk(content: string) {
  mocks.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ finish_reason: "stop", message: { content } }],
    }),
    text: async () => "",
  });
}

function mockFetchError(status: number, body: string) {
  mocks.fetch.mockResolvedValue({
    ok: false,
    status,
    text: async () => body,
    json: async () => { throw new Error("not JSON"); },
  });
}

// ─── callTextModel ────────────────────────────────────────────────────────────

describe("callTextModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.getCloudflareContext.mockResolvedValue(ENV_WITH_KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when OPENROUTER_API_KEY is not configured", async () => {
    mocks.getCloudflareContext.mockResolvedValue(ENV_NO_KEY);

    await expect(callTextModel("system", "user")).rejects.toThrow(
      "OPENROUTER_API_KEY is not configured"
    );
  });

  it("returns content string on successful response", async () => {
    mockFetchOk('{"name":"iPhone"}');

    const result = await callTextModel("Be helpful", "What is this?");
    expect(result).toBe('{"name":"iPhone"}');
  });

  it("sends correct headers and body to OpenRouter", async () => {
    mockFetchOk("{}");

    await callTextModel("system prompt", "user message");

    expect(mocks.fetch).toHaveBeenCalledOnce();
    const [url, options] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("openrouter.ai");
    expect(url).toContain("/chat/completions");

    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-or-test-key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body as string);
    expect(body.model).toBe(TEXT_MODEL);
    expect(body.messages).toEqual([
      { role: "system", content: "system prompt" },
      { role: "user", content: "user message" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("throws OpenRouterApiError on HTTP 429", async () => {
    mockFetchError(429, "Too Many Requests");

    const error = await callTextModel("s", "u").catch((e) => e);
    expect(error).toBeInstanceOf(OpenRouterApiError);
    expect(error.status).toBe(429);
    expect(error.message).toContain("429");
  });

  it("throws OpenRouterApiError on HTTP 402", async () => {
    mockFetchError(402, "Payment Required");

    const error = await callTextModel("s", "u").catch((e) => e);
    expect(error).toBeInstanceOf(OpenRouterApiError);
    expect(error.status).toBe(402);
  });

  it("throws OpenRouterApiError on HTTP 500", async () => {
    mockFetchError(500, "Internal Server Error");

    const error = await callTextModel("s", "u").catch((e) => e);
    expect(error).toBeInstanceOf(OpenRouterApiError);
    expect(error.status).toBe(500);
  });

  it("throws plain Error when response body is not valid JSON", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError("Unexpected token"); },
      text: async () => "",
    });

    await expect(callTextModel("s", "u")).rejects.toThrow(
      "OpenRouter returned non-JSON response body"
    );
  });

  it("throws plain Error when choices array is empty", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
      text: async () => "",
    });

    await expect(callTextModel("s", "u")).rejects.toThrow(
      "OpenRouter returned empty choices"
    );
  });

  it("throws plain Error when message content is null", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ finish_reason: "content_filter", message: { content: null } }],
      }),
      text: async () => "",
    });

    await expect(callTextModel("s", "u")).rejects.toThrow(
      "OpenRouter returned null content"
    );
  });

  it("OpenRouterApiError instanceof check works (ES2017 prototype fix)", () => {
    const err = new OpenRouterApiError(429, "Rate limited");
    expect(err).toBeInstanceOf(OpenRouterApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(429);
    expect(err.name).toBe("OpenRouterApiError");
  });
});
