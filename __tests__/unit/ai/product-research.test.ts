import { describe, expect, it } from "vitest";
import { researchProduct, type ResearchProgress } from "@/lib/ai/product-research";
import type Anthropic from "@anthropic-ai/sdk";

function makeAnthropicStub(content: unknown[]): Anthropic {
  return {
    messages: {
      create: async () => ({ content, stop_reason: "end_turn" }),
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
  it("émet progress puis done pour une sortie valide", async () => {
    const anthropic = makeAnthropicStub([
      { type: "tool_use", name: "web_search", id: "1", input: { query: "Galaxy A55" } },
      { type: "tool_use", name: "web_search", id: "2", input: { query: "Galaxy A55 images" } },
      { type: "tool_use", name: "submit_product", id: "3", input: validOutput },
    ]);

    const events = await drain(researchProduct("Galaxy A55", anthropic));

    expect(events.map((e) => e.type)).toEqual(["progress", "progress", "progress", "done"]);
    expect((events.at(-1) as { type: "done"; output: typeof validOutput }).output.name).toBe("Galaxy A55");
  });

  it("émet not_found", async () => {
    const anthropic = makeAnthropicStub([
      { type: "tool_use", name: "submit_product", id: "x", input: { not_found: true, reason: "unknown" } },
    ]);
    const events = await drain(researchProduct("zxzx", anthropic));
    expect(events[0]).toEqual({ type: "progress", step: "finalize" });
    expect(events.at(-1)).toEqual({ type: "not_found", reason: "unknown" });
  });

  it("émet error pour une sortie invalide", async () => {
    const anthropic = makeAnthropicStub([
      { type: "tool_use", name: "submit_product", id: "x", input: { garbage: true } },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.find((e) => e.type === "error")).toEqual({ type: "error", code: "invalid_ai_output" });
  });

  it("émet error si submit_product jamais appelé", async () => {
    const anthropic = makeAnthropicStub([
      { type: "text", text: "hmm" },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "api_error" });
  });
});
