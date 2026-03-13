import { describe, it, expect } from "vitest";
import { escapeHtml, sanitizeLegacyHtml } from "@/lib/utils/html";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
  it("escapes less-than", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });
  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });
  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
  it("single-pass only — does not un-escape existing entities", () => {
    expect(escapeHtml("a &amp; b")).toBe("a &amp;amp; b");
  });
});

describe("sanitizeLegacyHtml", () => {
  it("passes through safe HTML unchanged in structure", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeLegacyHtml(input)).toBe("<p>Hello <strong>world</strong></p>");
  });
  it("strips disallowed tags", () => {
    expect(sanitizeLegacyHtml("<p>text</p><div>bad</div>")).toBe("<p>text</p>bad");
  });
  it("removes script tags and their content", () => {
    expect(sanitizeLegacyHtml('<p>ok</p><script>alert("xss")</script>')).toBe("<p>ok</p>");
  });
  it("strips attributes from allowed tags", () => {
    expect(sanitizeLegacyHtml('<p class="foo">text</p>')).toBe("<p>text</p>");
  });
  it("keeps safe href on <a>", () => {
    expect(sanitizeLegacyHtml('<a href="https://example.com">link</a>')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer">link</a>',
    );
  });
  it("strips javascript: href", () => {
    expect(sanitizeLegacyHtml('<a href="javascript:alert(1)">bad</a>')).toBe("<a>bad</a>");
  });
  it("keeps <br> and <hr> self-closing", () => {
    expect(sanitizeLegacyHtml("line1<br>line2<hr>")).toBe("line1<br>line2<hr>");
  });
});
