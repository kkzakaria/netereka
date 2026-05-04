import { describe, expect, it, vi, beforeEach } from "vitest";
import { filterByVision } from "@/lib/ai/image-vision-filter";
import type Anthropic from "@anthropic-ai/sdk";
import type { ImageSearchResultItem } from "@/lib/ai/image-search";

function makeAnthropic(toolInput: unknown, opts: { throws?: Error } = {}): Anthropic {
  return {
    messages: {
      create: opts.throws
        ? vi.fn().mockRejectedValue(opts.throws)
        : vi.fn().mockResolvedValue({
            content: [
              { type: "tool_use", id: "tu_1", name: "report_filtering", input: toolInput },
            ],
            stop_reason: "tool_use",
          }),
    },
  } as unknown as Anthropic;
}

function candidate(i: number, opts: { thumb?: string | null } = {}): ImageSearchResultItem {
  return {
    url: `https://x.test/${i}.jpg`,
    source_domain: "x.test",
    title: `Image ${i}`,
    thumbnail_url: opts.thumb === undefined ? `https://imgs.search.brave.com/${i}.jpg` : opts.thumb,
  };
}

describe("filterByVision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne le sous-ensemble indiqué par keep_indexes", async () => {
    const anthropic = makeAnthropic({ keep_indexes: [0, 2] });
    const candidates = [candidate(0), candidate(1), candidate(2)];

    const result = await filterByVision(candidates, anthropic);

    expect(result).toHaveLength(2);
    expect(result[0].url).toBe(candidates[0].url);
    expect(result[1].url).toBe(candidates[2].url);
  });

  it("retourne tableau vide quand keep_indexes est vide", async () => {
    const anthropic = makeAnthropic({ keep_indexes: [] });
    const result = await filterByVision([candidate(0), candidate(1)], anthropic);
    expect(result).toEqual([]);
  });

  it("retourne tableau vide pour input vide sans appel API", async () => {
    const createMock = vi.fn();
    const anthropic = { messages: { create: createMock } } as unknown as Anthropic;
    const result = await filterByVision([], anthropic);
    expect(result).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("garde les candidats sans thumbnail_url (impossibles à inspecter)", async () => {
    const anthropic = makeAnthropic({ keep_indexes: [0] });
    const candidates = [
      candidate(0), // index 0 dans inspectable (a un thumb)
      candidate(1, { thumb: null }), // pas de thumb — gardé par défaut
      candidate(2), // index 1 dans inspectable
    ];

    const result = await filterByVision(candidates, anthropic);

    // keep_indexes: [0] → index 0 dans inspectable = candidate(0)
    // candidate(1) gardé car non-inspectable
    // candidate(2) rejeté
    expect(result.map((c) => c.url)).toEqual([candidates[0].url, candidates[1].url]);
  });

  it("retourne tous les candidats si vision API throws (graceful degradation)", async () => {
    const anthropic = makeAnthropic(undefined, { throws: new Error("network") });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const candidates = [candidate(0), candidate(1)];

    const result = await filterByVision(candidates, anthropic);

    expect(result).toEqual(candidates);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("retourne tous les candidats si la réponse n'a pas de tool_use", async () => {
    const anthropic = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "no idea" }],
          stop_reason: "end_turn",
        }),
      },
    } as unknown as Anthropic;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const candidates = [candidate(0), candidate(1)];

    const result = await filterByVision(candidates, anthropic);

    expect(result).toEqual(candidates);
    warnSpy.mockRestore();
  });

  it("retourne tous les candidats si keep_indexes manquant ou non-array", async () => {
    const anthropic = makeAnthropic({ wrong: "shape" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const candidates = [candidate(0), candidate(1)];

    const result = await filterByVision(candidates, anthropic);

    expect(result).toEqual(candidates);
    warnSpy.mockRestore();
  });

  it("ignore les index hors-limites et non-entiers dans keep_indexes", async () => {
    const anthropic = makeAnthropic({ keep_indexes: [0, 99, -1, "abc", 1.5, 2] });
    const candidates = [candidate(0), candidate(1), candidate(2)];

    const result = await filterByVision(candidates, anthropic);

    // 0 et 2 valides ; 99 hors-limites silencieusement ignoré ; -1, "abc", 1.5 rejetés par filtre
    expect(result.map((c) => c.url)).toEqual([candidates[0].url, candidates[2].url]);
  });

  it("envoie chaque image avec son contexte (source_domain + title)", async () => {
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: "tool_use", id: "tu_1", name: "report_filtering", input: { keep_indexes: [] } }],
    });
    const anthropic = { messages: { create: createMock } } as unknown as Anthropic;

    await filterByVision([candidate(0), candidate(1)], anthropic);

    const params = createMock.mock.calls[0][0];
    const userContent = params.messages[0].content;
    expect(userContent[0]).toEqual({ type: "text", text: "Image 0 (x.test) — Image 0" });
    expect(userContent[1]).toEqual({
      type: "image",
      source: { type: "url", url: "https://imgs.search.brave.com/0.jpg" },
    });
    // Force le tool_use via tool_choice pour éviter une réponse texte évasive
    expect(params.tool_choice).toEqual({ type: "tool", name: "report_filtering" });
  });
});
