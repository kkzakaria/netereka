import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/utils", () => ({ cn: (...a: unknown[]) => a.filter(Boolean).join(" ") }));

import { freeContentLayout } from "@/components/storefront/product-story/story-free-content";

describe("freeContentLayout", () => {
  it("ne contraint ni la largeur ni la typographie en mode html, mais pose un plancher", () => {
    const { outerClass, innerClass } = freeContentLayout("html");
    expect(outerClass).not.toContain("max-w-3xl");
    expect(innerClass).not.toContain("prose prose-lg");
    expect(innerClass).toContain("nk-prose");
  });

  it("conserve le conteneur de lecture en mode richtext", () => {
    const { outerClass, innerClass } = freeContentLayout("richtext");
    expect(outerClass).toContain("max-w-3xl");
    expect(innerClass).toContain("prose");
  });

  it("traite un type absent comme du richtext", () => {
    expect(freeContentLayout(undefined).innerClass).toContain("prose");
  });
});
