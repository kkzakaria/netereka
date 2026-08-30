import { describe, it, expect, vi } from "vitest";
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

describe("descriptionToHtml with description_type", () => {
  it("routes richtext type through Lexical converter", () => {
    const lexicalJson = JSON.stringify({
      root: {
        type: "root",
        children: [
          { type: "paragraph", children: [{ type: "text", text: "Hello", format: 0 }] },
        ],
      },
    });
    expect(descriptionToHtml(lexicalJson, "richtext")).toBe("<p>Hello</p>");
  });

  it("routes html type by returning the HTML as-is", () => {
    const html = '<div class="promo"><p>Sale!</p></div>';
    expect(descriptionToHtml(html, "html")).toBe(html);
  });

  it("falls back to heuristic when type is undefined (backward compat)", () => {
    const lexicalJson = JSON.stringify({
      root: {
        type: "root",
        children: [
          { type: "paragraph", children: [{ type: "text", text: "Hello", format: 0 }] },
        ],
      },
    });
    expect(descriptionToHtml(lexicalJson)).toBe("<p>Hello</p>");
  });

  it("returns empty for null/empty input regardless of type", () => {
    expect(descriptionToHtml("", "html")).toBe("");
    expect(descriptionToHtml("", "richtext")).toBe("");
  });

  // ── description_type lies about the content (issue #145) ───────────────────
  //
  // `description_type` records what the admin editor MEANT to store, not what
  // the column actually holds. Rows written before the rich-text editor shipped
  // — or repaired by hand in D1 — carry type "richtext" over plain text or
  // legacy HTML. Those must render on their real format, not be swallowed.

  it("renders plain text stored under richtext type", () => {
    expect(descriptionToHtml("L'iPhone 17 Pro est le dernier modele.", "richtext")).toBe(
      "<p>L&#39;iPhone 17 Pro est le dernier modele.</p>",
    );
  });

  it("paragraphs multi-line plain text stored under richtext type", () => {
    expect(descriptionToHtml("Para one\n\nPara two\nsuite", "richtext")).toBe(
      "<p>Para one</p><p>Para two<br>suite</p>",
    );
  });

  it("escapes HTML-special characters in plain text stored under richtext type", () => {
    expect(descriptionToHtml('Ecran 6" & <promo>', "richtext")).toBe(
      "<p>Ecran 6&quot; &amp; &lt;promo&gt;</p>",
    );
  });

  it("sanitizes legacy HTML stored under richtext type", () => {
    const result = descriptionToHtml(
      '<p>Hello <strong>world</strong></p><script>alert("xss")</script>',
      "richtext",
    );
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hello <strong>world</strong></p>");
  });

  it("does not log when plain text is stored under richtext type", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      descriptionToHtml("plain text product description", "richtext");
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  // ── Non-regression: genuine data anomalies must still be reported ──────────

  it("still logs and returns empty for malformed JSON under richtext type", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(descriptionToHtml('{"root": {broken}', "richtext")).toBe("");
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("still logs and returns empty for JSON without a root key under richtext type", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(descriptionToHtml('{"foo":"bar"}', "richtext")).toBe("");
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("sanitizes HTML at read time for defense-in-depth", () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = descriptionToHtml(html, "html");
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hello</p>");
    expect(result).toContain("<p>World</p>");
  });
});
