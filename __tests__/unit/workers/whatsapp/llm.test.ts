import { describe, it, expect, vi } from "vitest";
import { buildSystemPrompt, callLLM } from "../../../../workers/whatsapp/src/llm";

describe("buildSystemPrompt", () => {
  it("contains key instructions", () => {
    const prompt = buildSystemPrompt(false);
    expect(prompt).toContain("NETEREKA Electronic");
    expect(prompt).toContain("XOF");
    expect(prompt).toContain("FCFA");
    expect(prompt).toContain("français");
  });

  it("includes account linking hint when not verified", () => {
    const prompt = buildSystemPrompt(false);
    expect(prompt).toContain("compte");
  });

  it("includes order capability when verified", () => {
    const prompt = buildSystemPrompt(true);
    expect(prompt).toContain("commander");
  });
});

describe("callLLM", () => {
  it("returns text response when no tool call", async () => {
    const mockAI = {
      run: vi.fn().mockResolvedValueOnce({
        response: "Bienvenue chez NETEREKA!",
      }),
    };

    const result = await callLLM(
      mockAI as unknown as Ai,
      [{ role: "user", content: "Bonjour" }],
      true
    );

    expect(result).toEqual({
      type: "text",
      content: "Bienvenue chez NETEREKA!",
    });
  });

  it("returns tool_call when LLM wants to call a function", async () => {
    const mockAI = {
      run: vi.fn().mockResolvedValueOnce({
        response: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "search_products",
              arguments: '{"query":"iphone"}',
            },
          },
        ],
      }),
    };

    const result = await callLLM(
      mockAI as unknown as Ai,
      [{ role: "user", content: "Montrez-moi les iPhones" }],
      true
    );

    expect(result).toEqual({
      type: "tool_call",
      toolCalls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "search_products", arguments: '{"query":"iphone"}' },
        },
      ],
    });
  });
});
