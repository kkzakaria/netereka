import { describe, expect, it, vi } from "vitest";
import { classifyError, researchProduct, type ResearchProgress } from "@/lib/ai/product-research";
import type Anthropic from "@anthropic-ai/sdk";

interface StubEvent {
  type: string;
  content_block?: { type: string; name?: string; input?: unknown };
}
interface StubTurn {
  events: StubEvent[];
  stop_reason?: "end_turn" | "tool_use" | "max_tokens";
}

/**
 * Build a minimal Anthropic stub. `messages.stream(...)` returns a turn-aware
 * object — each call advances to the next StubTurn so we can exercise the
 * multi-turn tool-use loop. Each turn yields its events and exposes a
 * `finalMessage()` matching the turn's stop_reason + derived tool_use blocks.
 *
 * Backwards-compat: `makeAnthropicStub(events)` (legacy single-turn shape)
 * is treated as one turn with stop_reason="end_turn".
 *
 * Tracks `passedMessages` so tests can assert the conversation thread shape
 * across turns (assistant content + tool_result echoes).
 */
function makeAnthropicStub(turnsOrEvents: StubTurn[] | StubEvent[]): Anthropic & { calls(): unknown[] } {
  const turns: StubTurn[] = Array.isArray(turnsOrEvents) && turnsOrEvents.length > 0 && "events" in (turnsOrEvents[0] as object)
    ? (turnsOrEvents as StubTurn[])
    : [{ events: turnsOrEvents as StubEvent[], stop_reason: "end_turn" }];
  let turnIdx = 0;
  const passedMessages: unknown[] = [];

  const stub = {
    messages: {
      stream: (params: { messages: unknown[] }) => {
        // Snapshot the array — the loop keeps pushing into the same `messages`
        // reference, so capturing by reference would show the *final* state.
        passedMessages.push([...params.messages]);
        const turn = turns[turnIdx] ?? turns[turns.length - 1];
        const turnId = turnIdx;
        turnIdx++;
        const toolUses = turn.events
          .filter((e) => e.type === "content_block_start" && e.content_block?.type === "tool_use")
          .map((e, idx) => ({
            type: "tool_use" as const,
            id: `tu_${turnId}_${idx}`,
            name: e.content_block!.name,
            input: e.content_block!.input,
          }));

        const iterable = (async function* () {
          for (const ev of turn.events) yield ev;
        })();

        return {
          [Symbol.asyncIterator]() { return iterable; },
          finalMessage: async () => ({
            content: toolUses,
            stop_reason: turn.stop_reason ?? "end_turn",
          }),
        };
      },
    },
    calls: () => passedMessages,
  };
  return stub as unknown as Anthropic & { calls(): unknown[] };
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

  it("anti-régression prompt: interdiction de fabriquer des URLs reste explicite", async () => {
    // Load-bearing instruction — the entire image-hallucination problem comes
    // back if this line gets accidentally removed in a future prompt rewrite.
    const { buildSystemPrompt } = await import("@/lib/ai/product-research");
    const prompt = buildSystemPrompt({ hasImageSearch: true });
    expect(prompt).toMatch(/N'INVENTE JAMAIS d'URLs/);
    expect(prompt).toMatch(/UNIQUEMENT des URLs/);
  });

  it("sans braveApiKey, le prompt instruit le modèle de retourner image_candidates: []", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/product-research");
    const prompt = buildSystemPrompt({ hasImageSearch: false });
    expect(prompt).toMatch(/image_search non disponible/i);
    expect(prompt).toMatch(/image_candidates: \[\]/);
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

  it("émet error:model_no_submit quand le modèle s'arrête sans submit_product", async () => {
    // No tool_use blocks AT ALL → no submit_product, stop_reason will default
    // to "end_turn" in the stub → triggers the model_no_submit branch.
    const anthropic = makeAnthropicStub([
      { type: "content_block_start", content_block: { type: "text", name: undefined } },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "model_no_submit" });
  });

  it("multi-turn happy path : image_search → tool_result → submit_product", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        results: [{ properties: { url: "https://samsung.com/a.jpg" }, source: "samsung.com", title: "x" }],
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const anthropic = makeAnthropicStub([
      {
        events: [
          { type: "content_block_start", content_block: { type: "server_tool_use", name: "web_search", input: { query: "Galaxy A55" } } },
          { type: "content_block_start", content_block: { type: "tool_use", name: "image_search", input: { query: "Galaxy A55 product photo" } } },
        ],
        stop_reason: "tool_use",
      },
      {
        events: [
          { type: "content_block_start", content_block: { type: "tool_use", name: "submit_product", input: validOutput } },
        ],
        stop_reason: "end_turn",
      },
    ]);

    const events = await drain(researchProduct("Galaxy A55", anthropic, { braveApiKey: "test-key" }));

    // Brave called once with the model's query
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0] as string).toContain("q=Galaxy+A55+product+photo");
    // Conversation thread: 2nd turn's messages must include the tool_result
    const secondTurnMessages = (anthropic as unknown as { calls: () => unknown[][] }).calls()[1];
    expect(Array.isArray(secondTurnMessages)).toBe(true);
    // Last message before turn 2 must be a `user` role with tool_result content
    const last = (secondTurnMessages as { role: string; content: unknown }[]).at(-1)!;
    expect(last.role).toBe("user");
    expect(Array.isArray(last.content)).toBe(true);
    const toolResult = (last.content as { type: string; tool_use_id: string }[])[0];
    expect(toolResult.type).toBe("tool_result");
    expect(toolResult.tool_use_id).toBe("tu_0_0");
    // Terminal: done
    expect(events.at(-1)?.type).toBe("done");

    vi.unstubAllGlobals();
  });

  it("recovery: Brave échoue (auth_failed) → tool_result is_error → modèle émet submit_product avec image_candidates: []", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));

    const outputNoImages = { ...validOutput, image_candidates: [] };
    const anthropic = makeAnthropicStub([
      {
        events: [
          { type: "content_block_start", content_block: { type: "tool_use", name: "image_search", input: { query: "xx" } } },
        ],
        stop_reason: "tool_use",
      },
      {
        events: [
          { type: "content_block_start", content_block: { type: "tool_use", name: "submit_product", input: outputNoImages } },
        ],
        stop_reason: "end_turn",
      },
    ]);

    const events = await drain(researchProduct("x", anthropic, { braveApiKey: "bad-key" }));

    // Tool result must be flagged is_error so the model recovers
    const secondTurnMessages = (anthropic as unknown as { calls: () => unknown[][] }).calls()[1];
    const last = (secondTurnMessages as { role: string; content: unknown }[]).at(-1)!;
    const toolResult = (last.content as { is_error: boolean; content: string }[])[0];
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toContain("auth_failed");
    // And the model recovered with an empty image_candidates fiche
    const terminal = events.at(-1) as { type: "done"; output: { image_candidates: unknown[] } };
    expect(terminal.type).toBe("done");
    expect(terminal.output.image_candidates).toEqual([]);

    vi.unstubAllGlobals();
  });

  it("loop_exhausted quand le modèle ne fait que retry image_search", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } }),
    ));

    // 9 turns of pure image_search (more than MAX_LOOP_ITERATIONS=8). Stub
    // returns the last turn forever past its array length, so the loop will
    // see image_search every time and never get submit_product.
    const stuckTurn = {
      events: [
        { type: "content_block_start", content_block: { type: "tool_use", name: "image_search", input: { query: "stuck" } } },
      ],
      stop_reason: "tool_use" as const,
    };
    const anthropic = makeAnthropicStub(Array(9).fill(stuckTurn));

    const events = await drain(researchProduct("x", anthropic, { braveApiKey: "k" }));

    expect(events.at(-1)).toEqual({ type: "error", code: "loop_exhausted" });
    vi.unstubAllGlobals();
  });

  it("internal_error quand stop_reason=tool_use mais aucun client tool", async () => {
    // Defensive-impossible state: stop_reason="tool_use" but only
    // server_tool_use blocks. Anthropic shouldn't ever produce this, but if
    // it does, we surface as internal_error (code defect, not transient).
    const anthropic = makeAnthropicStub([
      {
        events: [
          { type: "content_block_start", content_block: { type: "server_tool_use", name: "web_search", input: {} } },
        ],
        stop_reason: "tool_use",
      },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "internal_error" });
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
