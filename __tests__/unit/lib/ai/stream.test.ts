import { describe, it, expect } from "vitest";
import { encodeSSE, parseSSELine } from "@/lib/ai/stream";

describe("encodeSSE", () => {
  it("formats a status event as SSE data line", () => {
    const bytes = encodeSSE({ type: "status", message: "Recherche..." });
    const text = new TextDecoder().decode(bytes);
    expect(text).toBe('data: {"type":"status","message":"Recherche..."}\n\n');
  });

  it("formats a done event with blueprint data", () => {
    const payload = {
      type: "done" as const,
      blueprint: { name: "Test", brand: "", description: "d", short_description: "s",
        meta_title: "t", meta_description: "m", categoryId: "cat-1", variants: [] },
      categoryName: "Smartphones",
      imageUrls: [],
    };
    const text = new TextDecoder().decode(encodeSSE(payload));
    expect(text).toContain('"type":"done"');
    expect(text).toContain('"name":"Test"');
    expect(text.endsWith("\n\n")).toBe(true);
  });

  it("formats an error event", () => {
    const text = new TextDecoder().decode(encodeSSE({ type: "error", message: "Erreur" }));
    expect(text).toContain('"type":"error"');
    expect(text).toContain('"message":"Erreur"');
  });
});

describe("parseSSELine", () => {
  it("parses a valid data line", () => {
    const result = parseSSELine('data: {"type":"status","message":"ok"}');
    expect(result).toEqual({ type: "status", message: "ok" });
  });

  it("returns null for non-data lines", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine(": keep-alive")).toBeNull();
    expect(parseSSELine("event: custom")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseSSELine("data: not-json")).toBeNull();
  });
});
