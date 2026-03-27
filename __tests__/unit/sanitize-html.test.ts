import { describe, it, expect } from "vitest";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

describe("sanitizeDescriptionHtml", () => {
  it("preserves allowed tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeDescriptionHtml(input)).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("preserves allowed attributes (class, style)", () => {
    const input = '<div class="promo" style="color:red">Sale</div>';
    expect(sanitizeDescriptionHtml(input)).toBe('<div class="promo" style="color:red">Sale</div>');
  });

  it("strips script tags entirely", () => {
    const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    expect(sanitizeDescriptionHtml(input)).toBe("<p>Hello</p><p>World</p>");
  });

  it("strips event handler attributes", () => {
    const input = '<div onclick="alert(1)" onmouseover="hack()">text</div>';
    expect(sanitizeDescriptionHtml(input)).toBe("<div>text</div>");
  });

  it("strips iframe tags", () => {
    const input = '<iframe src="evil.com"></iframe><p>safe</p>';
    expect(sanitizeDescriptionHtml(input)).toBe("<p>safe</p>");
  });

  it("blocks javascript: in href", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("blocks data: in href", () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("data:");
  });

  it("preserves table tags", () => {
    const input = "<table><thead><tr><th>Spec</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>";
    expect(sanitizeDescriptionHtml(input)).toBe(input);
  });

  it("preserves img with safe src", () => {
    const input = '<img src="https://example.com/img.jpg" alt="product" width="200">';
    expect(sanitizeDescriptionHtml(input)).toBe('<img src="https://example.com/img.jpg" alt="product" width="200">');
  });

  it("strips img with javascript src", () => {
    const input = '<img src="javascript:alert(1)" alt="bad">';
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("scopes style blocks with provided product ID", () => {
    const input = "<style>p { color: red; }</style><p>text</p>";
    const result = sanitizeDescriptionHtml(input, "prod-123");
    expect(result).toContain(".desc-prod-123");
    expect(result).toContain("p");
    expect(result).toContain("color: red");
  });

  it("blocks @import in style blocks", () => {
    const input = '<style>@import url("evil.css"); p { color: red; }</style>';
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("@import");
  });

  it("blocks url() in style blocks", () => {
    const input = "<style>p { background: url('evil.png'); }</style>";
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("url(");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeDescriptionHtml("")).toBe("");
    expect(sanitizeDescriptionHtml("   ")).toBe("");
  });

  it("preserves figure and figcaption", () => {
    const input = '<figure><img src="https://x.com/a.jpg" alt="a"><figcaption>Caption</figcaption></figure>';
    expect(sanitizeDescriptionHtml(input)).toBe(input);
  });

  it("blocks vbscript: in href", () => {
    const input = '<a href="vbscript:MsgBox(1)">click</a>';
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("vbscript:");
  });

  it("blocks mixed-case javascript: URIs", () => {
    const input = '<a href="JaVaScRiPt:alert(1)">click</a>';
    expect(sanitizeDescriptionHtml(input)).not.toContain("JaVaScRiPt:");
  });

  it("blocks whitespace-padded javascript: URIs", () => {
    const input = '<a href="  javascript:alert(1)">click</a>';
    expect(sanitizeDescriptionHtml(input)).not.toContain("javascript:");
  });

  it("strips self-closing script tags", () => {
    const input = '<p>safe</p><script src="evil.js"/><p>ok</p>';
    expect(sanitizeDescriptionHtml(input)).not.toContain("script");
  });

  it("preserves style blocks without scoping when no productId given", () => {
    const input = "<style>p { color: red; }</style><p>text</p>";
    const result = sanitizeDescriptionHtml(input);
    expect(result).toContain("p { color: red; }");
    expect(result).not.toContain(".desc-");
  });

  it("scopes comma-separated CSS selectors individually", () => {
    const input = "<style>h1, h2, .promo { color: blue; }</style>";
    const result = sanitizeDescriptionHtml(input, "p1");
    expect(result).toContain(".desc-p1 h1");
    expect(result).toContain(".desc-p1 h2");
    expect(result).toContain(".desc-p1 .promo");
  });
});
