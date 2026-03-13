import { describe, it, expect } from "vitest";
import { lexicalJsonToHtml } from "@/lib/utils/lexical-to-html";

function state(children: unknown[]) {
  return { root: { type: "root", children } };
}
function para(children: unknown[]) {
  return { type: "paragraph", children };
}
function text(t: string, format = 0) {
  return { type: "text", text: t, format };
}

describe("lexicalJsonToHtml", () => {
  it("renders a simple paragraph", () => {
    expect(lexicalJsonToHtml(state([para([text("Hello")])]))).toBe(
      "<p>Hello</p>",
    );
  });

  it("renders bold text (format=1)", () => {
    expect(lexicalJsonToHtml(state([para([text("bold", 1)])]))).toBe(
      "<p><strong>bold</strong></p>",
    );
  });

  it("renders italic text (format=2)", () => {
    expect(lexicalJsonToHtml(state([para([text("italic", 2)])]))).toBe(
      "<p><em>italic</em></p>",
    );
  });

  it("renders underline text (format=8)", () => {
    expect(lexicalJsonToHtml(state([para([text("ul", 8)])]))).toBe(
      "<p><u>ul</u></p>",
    );
  });

  it("renders strikethrough text (format=4)", () => {
    expect(lexicalJsonToHtml(state([para([text("st", 4)])]))).toBe(
      "<p><s>st</s></p>",
    );
  });

  it("renders inline code (format=16)", () => {
    expect(lexicalJsonToHtml(state([para([text("code", 16)])]))).toBe(
      "<p><code>code</code></p>",
    );
  });

  it("combines bold+italic (format=3)", () => {
    const html = lexicalJsonToHtml(state([para([text("bi", 3)])]));
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
  });

  it("renders h1 heading", () => {
    expect(
      lexicalJsonToHtml(state([{ type: "heading", tag: "h1", children: [text("Title")] }])),
    ).toBe("<h1>Title</h1>");
  });

  it("renders h2 heading", () => {
    expect(
      lexicalJsonToHtml(state([{ type: "heading", tag: "h2", children: [text("Sub")] }])),
    ).toBe("<h2>Sub</h2>");
  });

  it("renders unordered list", () => {
    const html = lexicalJsonToHtml(
      state([
        {
          type: "list",
          listType: "bullet",
          children: [
            { type: "listitem", children: [text("A")] },
            { type: "listitem", children: [text("B")] },
          ],
        },
      ]),
    );
    expect(html).toBe("<ul><li>A</li><li>B</li></ul>");
  });

  it("renders ordered list", () => {
    const html = lexicalJsonToHtml(
      state([
        {
          type: "list",
          listType: "number",
          children: [{ type: "listitem", children: [text("One")] }],
        },
      ]),
    );
    expect(html).toBe("<ol><li>One</li></ol>");
  });

  it("renders blockquote", () => {
    expect(
      lexicalJsonToHtml(state([{ type: "quote", children: [text("q")] }])),
    ).toBe("<blockquote>q</blockquote>");
  });

  it("renders code block with code-highlight children (real Lexical format)", () => {
    expect(
      lexicalJsonToHtml(
        state([{
          type: "code",
          children: [{ type: "code-highlight", text: "const x = 1;" }],
        }]),
      ),
    ).toBe("<pre><code>const x = 1;</code></pre>");
  });

  it("renders horizontal rule", () => {
    expect(lexicalJsonToHtml(state([{ type: "horizontalrule" }]))).toBe("<hr>");
  });

  it("renders link with safe href", () => {
    expect(
      lexicalJsonToHtml(
        state([
          para([{ type: "link", url: "https://example.com", children: [text("link")] }]),
        ]),
      ),
    ).toBe('<p><a href="https://example.com" rel="noopener noreferrer">link</a></p>');
  });

  it("strips link with javascript: href", () => {
    expect(
      lexicalJsonToHtml(
        state([
          para([{ type: "link", url: "javascript:alert(1)", children: [text("bad")] }]),
        ]),
      ),
    ).toBe("<p>bad</p>");
  });

  it("renders linebreak", () => {
    expect(
      lexicalJsonToHtml(state([para([text("a"), { type: "linebreak" }, text("b")])])),
    ).toBe("<p>a<br>b</p>");
  });

  it("HTML-escapes text content", () => {
    expect(lexicalJsonToHtml(state([para([text("<script>")])]))).toBe(
      "<p>&lt;script&gt;</p>",
    );
  });

  it("ignores unknown leaf node types gracefully", () => {
    expect(
      lexicalJsonToHtml(state([{ type: "unknown_node_type" }])),
    ).toBe("");
  });

  it("renders children of unknown container node types without a wrapper", () => {
    expect(
      lexicalJsonToHtml(state([{ type: "custom_container", children: [text("visible")] }])),
    ).toBe("visible");
  });

  it("returns empty string for empty root", () => {
    expect(lexicalJsonToHtml(state([]))).toBe("");
  });
});
