import { describe, it, expect } from "vitest";
import { escapeXml, stripHtml, formatPrice, availabilityFor } from "@/lib/seo/merchant-feed";

describe("escapeXml", () => {
  it("escapes XML-significant characters", () => {
    expect(escapeXml(`A & B < C > "D" 'E'`)).toBe("A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;");
  });
  it("returns empty string for null/undefined", () => {
    expect(escapeXml(null)).toBe("");
    expect(escapeXml(undefined)).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello&nbsp;<b>world</b></p>\n<p>!</p>")).toBe("Hello world !");
  });
  it("decodes common entities", () => {
    expect(stripHtml("Tom &amp; Jerry &lt;3 &quot;x&quot;")).toBe('Tom & Jerry <3 "x"');
  });
  it("returns empty string for null", () => {
    expect(stripHtml(null)).toBe("");
  });
});

describe("formatPrice", () => {
  it("formats an integer amount as XOF", () => {
    expect(formatPrice(150000)).toBe("150000 XOF");
  });
});

describe("availabilityFor", () => {
  it("is in_stock when quantity > 0", () => {
    expect(availabilityFor(3)).toBe("in_stock");
  });
  it("is out_of_stock when quantity is 0 or less", () => {
    expect(availabilityFor(0)).toBe("out_of_stock");
    expect(availabilityFor(-1)).toBe("out_of_stock");
  });
});
