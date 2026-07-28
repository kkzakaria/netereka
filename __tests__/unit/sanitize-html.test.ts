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

  it("escapes double quotes in attribute values to prevent injection", () => {
    const input = '<div class=foo"onclick=alert(1)>text</div>';
    const result = sanitizeDescriptionHtml(input);
    // The " in the unquoted value is escaped to &quot;, so the onclick
    // is safely contained inside the class attribute value, not a separate attribute
    expect(result).toContain('class="foo&quot;onclick=alert(1)"');
    expect(result).toContain("text");
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

  // Security regression (GHSA-92r4): tags using "/" as the attribute separator
  // must NOT bypass sanitization. Previously the tag regex only matched
  // whitespace-separated attributes, so these passed through verbatim.
  it("neutralizes onerror when '/' is used as the attribute separator", () => {
    const result = sanitizeDescriptionHtml("<img/src=x/onerror=alert(document.domain)>");
    // The tag is now parsed: the unquoted src value folds the rest of the
    // payload inside the quoted src attribute, so onerror is inert (not a
    // standalone attribute) and cannot fire. Crucially it does NOT pass through
    // verbatim as it did before the fix.
    expect(result).toBe('<img src="x/onerror=alert(document.domain)">');
    expect(result).not.toBe("<img/src=x/onerror=alert(document.domain)>");
  });

  it("strips a disallowed tag written with a '/' separator", () => {
    const result = sanitizeDescriptionHtml("<svg/onload=alert(1)>content");
    expect(result).not.toContain("<svg");
    expect(result).not.toMatch(/\bonload\s*=/i);
    expect(result).toContain("content");
  });

  it("neutralizes an onmouseover handler after a '/' separator on an allowed tag", () => {
    const result = sanitizeDescriptionHtml("<p/onmouseover=alert(1)>hi</p>");
    expect(result).not.toMatch(/\bonmouseover\s*=/i);
    expect(result).toContain("hi");
  });

  // Security regression (GHSA-m888): inline style must not carry url()/@import/
  // expression(), which leak outbound requests or execute legacy CSS.
  it("strips url() from an inline style attribute", () => {
    const result = sanitizeDescriptionHtml(
      '<div style="background:url(https://evil.example/leak)">x</div>'
    );
    expect(result).not.toContain("url(");
    expect(result).not.toContain("evil.example");
    expect(result).toContain("<div");
  });

  it("strips @import and expression() from an inline style attribute", () => {
    const result = sanitizeDescriptionHtml(
      '<div style="width:expression(alert(1));@import \'evil.css\'">x</div>'
    );
    expect(result).not.toContain("expression(");
    expect(result).not.toContain("@import");
  });

  it("keeps benign inline style declarations intact", () => {
    const result = sanitizeDescriptionHtml('<div style="color:red;font-weight:bold">x</div>');
    expect(result).toContain("color:red");
    expect(result).toContain("font-weight:bold");
  });

  it("strips an UNTERMINATED url( from an inline style attribute", () => {
    const result = sanitizeDescriptionHtml(
      '<div style="background:url(https://evil.example/leak">x</div>'
    );
    expect(result).not.toContain("url(");
    expect(result).not.toContain("evil.example");
  });

  it("strips an UNTERMINATED url( from a <style> block", () => {
    const result = sanitizeDescriptionHtml(
      "<style>p { background: url(https://evil.example/leak }</style><p>x</p>"
    );
    expect(result).not.toContain("url(");
    expect(result).not.toContain("evil.example");
  });
});

describe("style tag handling", () => {
  it("strips event handlers from a style tag closed with trailing whitespace", () => {
    const input = '<style onload="alert(1)">body{}</style >';
    expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
  });

  it("strips event handlers from an unterminated style tag", () => {
    const input = '<style onload="alert(1)">body{}';
    expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
  });

  it("strips unquoted event handlers on a style tag", () => {
    const input = "<style onload=alert(1)>body{}</style >";
    expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
  });

  it("strips event handlers regardless of tag case", () => {
    const input = '<STYLE ONLOAD="alert(1)">x</STYLE >';
    expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
  });

  it("still filters @import when the closing tag has trailing whitespace", () => {
    const input = '<style>@import url("//evil.example/x.css");</style >';
    expect(sanitizeDescriptionHtml(input)).not.toMatch(/@import/i);
  });
});
