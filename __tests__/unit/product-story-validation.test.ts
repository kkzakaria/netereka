import { describe, it, expect } from "vitest";
import {
  taglineSchema,
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
  HIGHLIGHT_ICON_NAMES,
} from "@/lib/validations/product-story";

describe("taglineSchema", () => {
  it("accepts null", () => {
    expect(taglineSchema.parse(null)).toBeNull();
  });
  it("accepts an empty string as null", () => {
    expect(taglineSchema.parse("")).toBeNull();
  });
  it("accepts a short string", () => {
    expect(taglineSchema.parse("Un iPhone qui dure.")).toBe("Un iPhone qui dure.");
  });
  it("rejects > 200 chars", () => {
    expect(() => taglineSchema.parse("x".repeat(201))).toThrow();
  });
});

describe("highlightsSchema", () => {
  const validIcon = HIGHLIGHT_ICON_NAMES[0];
  it("accepts null (block disabled)", () => {
    expect(highlightsSchema.parse(null)).toBeNull();
  });
  it("rejects an empty array", () => {
    expect(() => highlightsSchema.parse([])).toThrow();
  });
  it("rejects 1 or 2 items", () => {
    expect(() =>
      highlightsSchema.parse([{ icon: validIcon, label: "a" }]),
    ).toThrow();
  });
  it("accepts 3 items", () => {
    const items = Array.from({ length: 3 }, () => ({ icon: validIcon, label: "ok" }));
    expect(highlightsSchema.parse(items)).toHaveLength(3);
  });
  it("accepts 6 items", () => {
    const items = Array.from({ length: 6 }, () => ({ icon: validIcon, label: "ok" }));
    expect(highlightsSchema.parse(items)).toHaveLength(6);
  });
  it("rejects 7 items", () => {
    const items = Array.from({ length: 7 }, () => ({ icon: validIcon, label: "ok" }));
    expect(() => highlightsSchema.parse(items)).toThrow();
  });
  it("rejects an unknown icon", () => {
    expect(() =>
      highlightsSchema.parse([{ icon: "not-a-real-icon", label: "ok" }, { icon: validIcon, label: "ok" }, { icon: validIcon, label: "ok" }]),
    ).toThrow();
  });
  it("rejects a label > 80 chars", () => {
    expect(() =>
      highlightsSchema.parse([
        { icon: validIcon, label: "x".repeat(81) },
        { icon: validIcon, label: "ok" },
        { icon: validIcon, label: "ok" },
      ]),
    ).toThrow();
  });
});

describe("featureBlocksSchema", () => {
  const ok = { title: "T", body: "B" };
  it("accepts null", () => {
    expect(featureBlocksSchema.parse(null)).toBeNull();
  });
  it("rejects 1 item", () => {
    expect(() => featureBlocksSchema.parse([ok])).toThrow();
  });
  it("accepts 2 to 4 items", () => {
    expect(featureBlocksSchema.parse([ok, ok])).toHaveLength(2);
    expect(featureBlocksSchema.parse([ok, ok, ok, ok])).toHaveLength(4);
  });
  it("rejects 5 items", () => {
    expect(() => featureBlocksSchema.parse([ok, ok, ok, ok, ok])).toThrow();
  });
  it("rejects body > 600 chars", () => {
    expect(() =>
      featureBlocksSchema.parse([
        { title: "T", body: "x".repeat(601) },
        { title: "T", body: "B" },
      ]),
    ).toThrow();
  });
  it("accepts image_url and image_alt as optional", () => {
    const parsed = featureBlocksSchema.parse([
      { title: "T", body: "B", image_url: "products/abc/hero.jpg", image_alt: "alt" },
      { title: "T", body: "B" },
    ]);
    expect(parsed?.[0].image_url).toBe("products/abc/hero.jpg");
    expect(parsed?.[1].image_url).toBeUndefined();
  });
});

describe("faqSchema", () => {
  it("accepts null", () => {
    expect(faqSchema.parse(null)).toBeNull();
  });
  it("accepts an empty array (block disabled)", () => {
    expect(faqSchema.parse([])).toEqual([]);
  });
  it("accepts 5 items", () => {
    const items = Array.from({ length: 5 }, () => ({ question: "q", answer: "a" }));
    expect(faqSchema.parse(items)).toHaveLength(5);
  });
  it("rejects 6 items", () => {
    const items = Array.from({ length: 6 }, () => ({ question: "q", answer: "a" }));
    expect(() => faqSchema.parse(items)).toThrow();
  });
});
