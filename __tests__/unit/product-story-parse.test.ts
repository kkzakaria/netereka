import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseHighlights,
  parseFeatureBlocks,
  parseFaq,
  hydrateProductStoryFields,
} from "@/lib/utils/product-story";

describe("parseHighlights", () => {
  it("returns null for null / empty / invalid JSON", () => {
    expect(parseHighlights(null)).toBeNull();
    expect(parseHighlights("")).toBeNull();
    expect(parseHighlights("nope")).toBeNull();
  });

  it("returns null for JSON that does not match the shape", () => {
    expect(parseHighlights(JSON.stringify({ foo: "bar" }))).toBeNull();
    expect(parseHighlights(JSON.stringify([{ icon: "x" }]))).toBeNull();
  });

  it("returns parsed array for valid JSON", () => {
    const raw = JSON.stringify([
      { icon: "battery", label: "6000 mAh" },
      { icon: "camera", label: "108 MP" },
      { icon: "bolt", label: "Charge rapide" },
    ]);
    expect(parseHighlights(raw)).toEqual([
      { icon: "battery", label: "6000 mAh" },
      { icon: "camera", label: "108 MP" },
      { icon: "bolt", label: "Charge rapide" },
    ]);
  });
});

describe("parseFeatureBlocks", () => {
  it("returns null for invalid JSON", () => {
    expect(parseFeatureBlocks("{{")).toBeNull();
  });
  it("accepts blocks with optional image fields", () => {
    const raw = JSON.stringify([
      { title: "A", body: "B" },
      { title: "C", body: "D", image_url: "x.jpg", image_alt: "alt" },
    ]);
    expect(parseFeatureBlocks(raw)).toEqual([
      { title: "A", body: "B" },
      { title: "C", body: "D", image_url: "x.jpg", image_alt: "alt" },
    ]);
  });
});

describe("parseFaq", () => {
  it("returns null for invalid JSON", () => {
    expect(parseFaq("nope")).toBeNull();
  });
  it("accepts an empty array", () => {
    expect(parseFaq("[]")).toEqual([]);
  });
});

describe("hydrateProductStoryFields", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  it("replaces raw JSON strings with parsed arrays/objects, preserving null", () => {
    const row = {
      id: "p1",
      tagline: "Hello",
      highlights: JSON.stringify([
        { icon: "battery", label: "L" },
        { icon: "battery", label: "L" },
        { icon: "battery", label: "L" },
      ]),
      feature_blocks: null,
      faq: JSON.stringify([]),
    };

    const hydrated = hydrateProductStoryFields(row);

    expect(hydrated.tagline).toBe("Hello");
    expect(hydrated.highlights).toHaveLength(3);
    expect(hydrated.feature_blocks).toBeNull();
    expect(hydrated.faq).toEqual([]);
  });

  it("logs and falls back to null when JSON is malformed", () => {
    const row = {
      id: "p1",
      tagline: null,
      highlights: "definitely not json",
      feature_blocks: null,
      faq: null,
    };

    const hydrated = hydrateProductStoryFields(row);
    expect(hydrated.highlights).toBeNull();
    expect(errSpy).toHaveBeenCalled();
  });
});
