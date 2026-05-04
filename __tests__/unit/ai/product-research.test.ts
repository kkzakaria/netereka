import { describe, expect, it } from "vitest";
import { classifyError, researchProduct, type ResearchProgress } from "@/lib/ai/product-research";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Build a minimal Anthropic stub where `messages.stream(...)` returns an object
 * that (a) yields the provided events as an async iterable, and (b) exposes a
 * `finalMessage()` method returning a message whose `content` is derived from
 * the `tool_use` events we recorded.
 */
function makeAnthropicStub(events: Array<{ type: string; content_block?: { type: string; name?: string; input?: unknown } }>): Anthropic {
  return {
    messages: {
      stream: () => {
        const toolUses = events
          .filter((e) => e.type === "content_block_start" && e.content_block?.type === "tool_use")
          .map((e) => ({
            type: "tool_use" as const,
            name: e.content_block!.name,
            input: e.content_block!.input,
          }));

        const iterable = (async function* () {
          for (const ev of events) yield ev;
        })();

        return {
          [Symbol.asyncIterator]() { return iterable; },
          finalMessage: async () => ({
            content: toolUses,
            stop_reason: "end_turn",
          }),
        };
      },
    },
  } as unknown as Anthropic;
}

async function drain(iter: AsyncGenerator<ResearchProgress>): Promise<ResearchProgress[]> {
  const out: ResearchProgress[] = [];
  for await (const ev of iter) out.push(ev);
  return out;
}

const validOutput = {
  name: "Galaxy A55",
  category_suggestion: "smartphones",
  attributes: { colors: [], dimensions: {}, specs: [] },
  story: {},
  seo: {},
  image_candidates: [{ url: "https://x.test/a.jpg", source_domain: "x.test" }],
};

describe("researchProduct", () => {
  it("émet progress (search) pour un server_tool_use web_search puis done", async () => {
    const anthropic = makeAnthropicStub([
      { type: "content_block_start", content_block: { type: "server_tool_use", name: "web_search", input: { query: "Galaxy A55" } } },
      { type: "content_block_start", content_block: { type: "tool_use", name: "submit_product", input: validOutput } },
    ]);

    const events = await drain(researchProduct("Galaxy A55", anthropic));

    expect(events.map((e) => e.type)).toEqual(["progress", "progress", "done"]);
    const terminal = events.at(-1) as { type: "done"; output: typeof validOutput };
    expect(terminal.output.name).toBe("Galaxy A55");
  });

  it("émet search → specs → images → finalize avec web_search puis image_search", async () => {
    const anthropic = makeAnthropicStub([
      { type: "content_block_start", content_block: { type: "server_tool_use", name: "web_search", input: { query: "a" } } },
      { type: "content_block_start", content_block: { type: "server_tool_use", name: "web_search", input: { query: "b" } } },
      { type: "content_block_start", content_block: { type: "tool_use", name: "image_search", input: { query: "x photo" } } },
      { type: "content_block_start", content_block: { type: "tool_use", name: "submit_product", input: validOutput } },
    ]);

    // Note: submit_product is in the same turn as image_search, so the loop
    // breaks before executing image_search. The progress emission still fires
    // on content_block_start. braveApiKey is what makes image_search appear in
    // the tools list — but the stub bypasses that, so we don't need a real key.
    const events = await drain(researchProduct("x", anthropic, { braveApiKey: "test" }));
    const progressSteps = events
      .filter((e) => e.type === "progress")
      .map((e) => (e as { type: "progress"; step: string }).step);
    expect(progressSteps).toEqual(["search", "specs", "images", "finalize"]);
  });

  it("émet not_found quand submit_product signale introuvable", async () => {
    const anthropic = makeAnthropicStub([
      { type: "content_block_start", content_block: { type: "tool_use", name: "submit_product", input: { not_found: true, reason: "unknown" } } },
    ]);
    const events = await drain(researchProduct("zxzx", anthropic));
    expect(events.at(-1)).toEqual({ type: "not_found", reason: "unknown" });
  });

  it("émet error:invalid_ai_output pour une sortie cassée", async () => {
    const anthropic = makeAnthropicStub([
      { type: "content_block_start", content_block: { type: "tool_use", name: "submit_product", input: { garbage: true } } },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "invalid_ai_output" });
  });

  it("buildTools n'inclut pas image_search quand braveApiKey est absent", async () => {
    // Even though the stub triggers an image_search progress event, the real
    // production behavior is that without a Brave key, image_search isn't
    // declared and the model can't call it. Pin via buildTools directly.
    const { buildTools } = await import("@/lib/ai/product-research");
    const without = buildTools({ hasImageSearch: false });
    const withImage = buildTools({ hasImageSearch: true });
    expect(without.find((t) => "name" in t && t.name === "image_search")).toBeUndefined();
    expect(withImage.find((t) => "name" in t && t.name === "image_search")).toBeDefined();
  });

  it("émet error:api_error si submit_product jamais appelé", async () => {
    const anthropic = makeAnthropicStub([
      { type: "content_block_start", content_block: { type: "text", name: undefined } },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "api_error" });
  });
});

describe("classifyError", () => {
  it("retourne timeout si aborted", () => {
    expect(classifyError(new Error("any"), true)).toBe("timeout");
  });

  it("retourne timeout pour AbortError", () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(classifyError(err, false)).toBe("timeout");
  });

  it("retourne auth_failed pour 401/403", () => {
    expect(classifyError({ status: 401 }, false)).toBe("auth_failed");
    expect(classifyError({ status: 403 }, false)).toBe("auth_failed");
  });

  it("retourne upstream_rate_limited pour 429", () => {
    expect(classifyError({ status: 429 }, false)).toBe("upstream_rate_limited");
  });

  it("retourne no_credits pour 400 avec message de solde", () => {
    const err = { status: 400, error: { error: { message: "Your credit balance is too low" } } };
    expect(classifyError(err, false)).toBe("no_credits");
  });

  it("retourne no_credits aussi pour 'billing' dans le message", () => {
    const err = { status: 400, error: { error: { message: "billing issue" } } };
    expect(classifyError(err, false)).toBe("no_credits");
  });

  it("retourne upstream_unavailable pour 5xx", () => {
    expect(classifyError({ status: 500 }, false)).toBe("upstream_unavailable");
    expect(classifyError({ status: 503 }, false)).toBe("upstream_unavailable");
  });

  it("retourne api_error pour un 400 non-billing ou erreur inconnue", () => {
    expect(classifyError({ status: 400, error: { error: { message: "bad request" } } }, false)).toBe("api_error");
    expect(classifyError(new Error("random"), false)).toBe("api_error");
    expect(classifyError(undefined, false)).toBe("api_error");
  });
});
