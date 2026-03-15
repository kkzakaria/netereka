import { describe, it, expect } from "vitest";
import { descriptionToHtml } from "@/lib/utils/description-to-html";

describe("descriptionToHtml", () => {
  // ── Empty / null-like inputs ───────────────────────────────────────────────

  it("returns empty string for empty input", () => {
    expect(descriptionToHtml("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(descriptionToHtml("   ")).toBe("");
  });

  // ── Lexical JSON path ──────────────────────────────────────────────────────

  it("renders Lexical JSON to HTML", () => {
    const state = JSON.stringify({
      root: {
        type: "root",
        children: [
          { type: "paragraph", children: [{ type: "text", text: "Hello", format: 0 }] },
        ],
      },
    });
    expect(descriptionToHtml(state)).toBe("<p>Hello</p>");
  });

  it("returns empty string when JSON is valid but has no root", () => {
    const input = '{"foo":"bar"}';
    // Not a valid Lexical state — return empty rather than rendering raw JSON as plain text
    expect(descriptionToHtml(input)).toBe("");
  });

  it("returns empty string when JSON is malformed", () => {
    const input = "{bad json}";
    // Invalid JSON starting with { — return empty rather than rendering garbage
    expect(descriptionToHtml(input)).toBe("");
  });

  // ── Legacy HTML path ───────────────────────────────────────────────────────

  it("sanitizes and returns legacy HTML", () => {
    expect(descriptionToHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "<p>Hello <strong>world</strong></p>",
    );
  });

  it("strips script tags from legacy HTML", () => {
    const result = descriptionToHtml('<p>safe</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>safe</p>");
  });

  it("strips disallowed tags from legacy HTML", () => {
    const result = descriptionToHtml("<p>text</p><div>bad</div>");
    expect(result).not.toContain("<div>");
    expect(result).toContain("bad");
  });

  // ── Plain text path ────────────────────────────────────────────────────────

  it("wraps plain text in <p> tags", () => {
    expect(descriptionToHtml("Hello world")).toBe("<p>Hello world</p>");
  });

  it("splits double newlines into multiple paragraphs", () => {
    const result = descriptionToHtml("Para one\n\nPara two");
    expect(result).toBe("<p>Para one</p><p>Para two</p>");
  });

  it("converts single newlines to <br> within a paragraph", () => {
    expect(descriptionToHtml("line1\nline2")).toBe("<p>line1<br>line2</p>");
  });

  it("HTML-escapes & and quotes in plain text", () => {
    expect(descriptionToHtml('Produit "A" & "B"')).toBe(
      "<p>Produit &quot;A&quot; &amp; &quot;B&quot;</p>",
    );
  });
});
