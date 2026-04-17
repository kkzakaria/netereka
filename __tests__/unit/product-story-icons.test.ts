import { describe, it, expect } from "vitest";
import { resolveHighlightIcon, HIGHLIGHT_ICON_MAP } from "@/components/storefront/product-story/icons";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

describe("HIGHLIGHT_ICON_MAP", () => {
  it("exposes every name in the validation shortlist", () => {
    for (const name of HIGHLIGHT_ICON_NAMES) {
      expect(HIGHLIGHT_ICON_MAP[name]).toBeDefined();
    }
  });
});

describe("resolveHighlightIcon", () => {
  it("returns the mapped icon for a valid name", () => {
    const icon = resolveHighlightIcon("battery");
    expect(icon).toBeDefined();
  });
  it("returns the fallback icon for an unknown name", () => {
    const fallback = resolveHighlightIcon("unknown-name-xyz");
    expect(fallback).toBeDefined();
    // should equal the star fallback
    expect(fallback).toBe(HIGHLIGHT_ICON_MAP["star"]);
  });
});
