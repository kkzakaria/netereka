# Rich Text Product Description Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Lexical WYSIWYG editor for product descriptions in the admin and render stored Lexical JSON (or legacy HTML/plain text) on the storefront.

**Architecture:** A custom DOM-free Lexical JSON→HTML serialiser (`lib/utils/lexical-to-html.ts`) runs server-side on Cloudflare Workers without needing `@lexical/html`. The admin editor component stores Lexical JSON state in the existing `description text` column. The storefront detects the storage format at render time (JSON/HTML/plain text) for full backward compatibility.

**Tech Stack:** Lexical 0.41, @lexical/react, @tailwindcss/typography, Next.js App Router, Cloudflare Workers, Tailwind CSS 4, shadcn/ui, Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/utils/html.ts` | Create | `escapeHtml`, `sanitizeLegacyHtml` helpers |
| `lib/utils/lexical-to-html.ts` | Create | DOM-free Lexical JSON→HTML serialiser |
| `__tests__/unit/html.test.ts` | Create | Tests for html.ts |
| `__tests__/unit/lexical-to-html.test.ts` | Create | Tests for lexical-to-html.ts |
| `components/storefront/product-details.tsx` | Modify | `DescriptionContent` → detect format + render HTML |
| `app/globals.css` | Modify | Add `@plugin "@tailwindcss/typography"` |
| `components/admin/rich-text-editor-toolbar.tsx` | Create | Lexical `ToolbarPlugin` component |
| `components/admin/rich-text-editor.tsx` | Create | `RichTextEditor` wrapper component |
| `components/admin/product-form-sections.tsx` | Modify | Replace `<Textarea>` for description with `RichTextEditor` |

---

## Chunk 1 — Logic Layer (utils + tests)

### Task 1: Install packages

- [ ] **Step 1: Install Lexical packages and Tailwind Typography**

```bash
npm install lexical @lexical/react @lexical/rich-text @lexical/list @lexical/link @lexical/code @lexical/history @lexical/utils @lexical/selection @tailwindcss/typography
```

Expected: packages added to `package.json`, no peer dependency errors.

- [ ] **Step 2: Verify install**

```bash
node -e "require('lexical'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/rich-text-description
git add package.json package-lock.json
git commit -m "chore: install Lexical and tailwindcss/typography"
```

---

### Task 2: HTML utility helpers

**Files:**
- Create: `lib/utils/html.ts`
- Create: `__tests__/unit/html.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/unit/html.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- html.test.ts
```

Expected: FAIL — `escapeHtml` and `sanitizeLegacyHtml` not found.

- [ ] **Step 3: Implement `lib/utils/html.ts`**

```ts
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li", "h1", "h2", "h3",
  "blockquote", "code", "pre", "hr", "a",
]);

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeLegacyHtml(html: string): string {
  // Remove script/style tags and their content entirely
  let result = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Process all HTML tags
  result = result.replace(
    /<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\/?>/g,
    (match) => {
      const isClosing = match.startsWith("</");
      const tagMatch = match.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
      if (!tagMatch) return "";
      const tag = tagMatch[1].toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (isClosing) return `</${tag}>`;
      if (tag === "a") {
        const hrefMatch = match.match(/href=["']([^"']*)["']/i);
        if (hrefMatch && /^(https?:|mailto:)/i.test(hrefMatch[1])) {
          return `<a href="${escapeHtml(hrefMatch[1])}" rel="noopener noreferrer">`;
        }
        return "<a>";
      }
      if (tag === "br" || tag === "hr") return `<${tag}>`;
      return `<${tag}>`;
    },
  );

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- html.test.ts
```

Expected: 12 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/html.ts __tests__/unit/html.test.ts
git commit -m "feat: add escapeHtml and sanitizeLegacyHtml utilities"
```

---

### Task 3: Lexical JSON→HTML serialiser

**Files:**
- Create: `lib/utils/lexical-to-html.ts`
- Create: `__tests__/unit/lexical-to-html.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/unit/lexical-to-html.test.ts`:

```ts
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

  it("ignores unknown node types gracefully", () => {
    expect(
      lexicalJsonToHtml(state([{ type: "unknown_node_type" }])),
    ).toBe("");
  });

  it("returns empty string for empty root", () => {
    expect(lexicalJsonToHtml(state([]))).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- lexical-to-html.test.ts
```

Expected: FAIL — `lexicalJsonToHtml` not found.

- [ ] **Step 3: Implement `lib/utils/lexical-to-html.ts`**

```ts
import { escapeHtml } from "./html";

// Lexical text format bitmask (from lexical source)
const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_STRIKETHROUGH = 4;
const IS_UNDERLINE = 8;
const IS_CODE = 16;

interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  tag?: string;
  listType?: string;
  url?: string;
}

export interface LexicalState {
  root: LexicalNode;
}

function serializeNode(node: LexicalNode): string {
  switch (node.type) {
    case "root":
      return (node.children ?? []).map(serializeNode).join("");

    case "paragraph": {
      const inner = (node.children ?? []).map(serializeNode).join("");
      return inner ? `<p>${inner}</p>` : "<br>";
    }

    case "heading": {
      const tag = node.tag ?? "h2";
      if (!["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return "";
      const inner = (node.children ?? []).map(serializeNode).join("");
      return `<${tag}>${inner}</${tag}>`;
    }

    case "list": {
      const tag = node.listType === "number" ? "ol" : "ul";
      const inner = (node.children ?? []).map(serializeNode).join("");
      return `<${tag}>${inner}</${tag}>`;
    }

    case "listitem": {
      const inner = (node.children ?? []).map(serializeNode).join("");
      return `<li>${inner}</li>`;
    }

    case "quote": {
      const inner = (node.children ?? []).map(serializeNode).join("");
      return `<blockquote>${inner}</blockquote>`;
    }

    case "code": {
      const inner = (node.children ?? []).map(serializeNode).join("");
      return `<pre><code>${inner}</code></pre>`;
    }

    // CodeHighlightNode — leaf node inside a code block, like TextNode but no format wrapping
    case "code-highlight": {
      const t = node.text ?? "";
      return t ? escapeHtml(t) : "";
    }

    case "horizontalrule":
      return "<hr>";

    case "link": {
      const url = node.url ?? "";
      const inner = (node.children ?? []).map(serializeNode).join("");
      if (!url || !/^(https?:|mailto:|\/)/i.test(url)) return inner;
      return `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${inner}</a>`;
    }

    case "text": {
      const t = node.text ?? "";
      if (!t) return "";
      const escaped = escapeHtml(t);
      const fmt = node.format ?? 0;
      if (fmt === 0) return escaped;
      let result = escaped;
      if (fmt & IS_CODE) result = `<code>${result}</code>`;
      if (fmt & IS_BOLD) result = `<strong>${result}</strong>`;
      if (fmt & IS_ITALIC) result = `<em>${result}</em>`;
      if (fmt & IS_UNDERLINE) result = `<u>${result}</u>`;
      if (fmt & IS_STRIKETHROUGH) result = `<s>${result}</s>`;
      return result;
    }

    case "linebreak":
      return "<br>";

    default:
      if (node.children?.length) {
        return node.children.map(serializeNode).join("");
      }
      return "";
  }
}

export function lexicalJsonToHtml(state: LexicalState): string {
  return serializeNode(state.root);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- lexical-to-html.test.ts
```

Expected: 20 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/lexical-to-html.ts __tests__/unit/lexical-to-html.test.ts
git commit -m "feat: add DOM-free Lexical JSON→HTML serialiser"
```

---

### Task 4: Update storefront renderer + Tailwind Typography

**Files:**
- Modify: `components/storefront/product-details.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add `@plugin "@tailwindcss/typography"` to `app/globals.css`**

Add as the second line (after `@import "tailwindcss"`):

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

- [ ] **Step 2: Update `DescriptionContent` in `components/storefront/product-details.tsx`**

Add imports at the top of the file:

```ts
import { lexicalJsonToHtml } from "@/lib/utils/lexical-to-html";
import { escapeHtml, sanitizeLegacyHtml } from "@/lib/utils/html";
```

Add `descriptionToHtml` function before `DescriptionContent`:

```ts
function descriptionToHtml(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    try {
      const state = JSON.parse(trimmed);
      if (state?.root !== undefined) {
        return lexicalJsonToHtml(state);
      }
    } catch {
      // fall through to other formats
    }
  }

  if (trimmed.startsWith("<")) {
    return sanitizeLegacyHtml(trimmed);
  }

  // Plain text: escape then wrap in paragraphs
  return trimmed
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
```

Replace the `DescriptionContent` function body:

```tsx
function DescriptionContent({ description }: { description: string | null }) {
  if (!description) return null;
  const html = descriptionToHtml(description);
  if (!html) return null;
  return (
    <div
      className="prose prose-sm max-w-prose dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

The old implementation (plain `<p>` tags in a loop) is replaced entirely.

- [ ] **Step 3: Start dev server and verify storefront renders HTML for existing descriptions**

```bash
npm run dev
```

Open a product page that has a description. HTML tags should now render as formatted content, not literal text.

- [ ] **Step 4: Commit**

```bash
git add "components/storefront/product-details.tsx" app/globals.css
git commit -m "feat(storefront): render rich text descriptions with format detection"
```

---

## Chunk 2 — Admin Editor

### Task 5: Lexical toolbar plugin

**Files:**
- Create: `components/admin/rich-text-editor-toolbar.tsx`

This is a Lexical plugin that must be mounted inside a `LexicalComposer` (done in Task 6). It reads the current selection state and dispatches editor commands.

- [ ] **Step 1: Create `components/admin/rich-text-editor-toolbar.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { cn } from "@/lib/utils";

type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "check"
  | "quote"
  | "code";

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));
    setIsCode(selection.hasFormat("code"));

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
      setBlockType(((parentList ?? element).getListType() as BlockType) ?? "bullet");
    } else if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as BlockType);
    } else {
      setBlockType(element.getType() as BlockType);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor, updateToolbar]);

  function setBlock(type: BlockType) {
    if (type === "bullet") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (type === "number") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else if (type === "check") {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      // Switching to a non-list block — remove the list first if needed
      if (["bullet", "number", "check"].includes(blockType)) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      }
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (type === "h1" || type === "h2" || type === "h3") {
          $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
        } else if (type === "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
        } else {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  }

  function insertLink() {
    // eslint-disable-next-line no-alert
    const url = window.prompt("URL du lien :");
    if (!url) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url });
  }

  return (
    <div className="flex flex-wrap gap-0.5 border-b bg-muted/30 p-1.5">
      {/* Undo / Redo */}
      <Btn title="Annuler" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        ↩
      </Btn>
      <Btn title="Rétablir" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        ↪
      </Btn>

      <Divider />

      {/* Block type selector */}
      <select
        value={blockType}
        onChange={(e) => setBlock(e.target.value as BlockType)}
        className="rounded border-0 bg-transparent px-1.5 py-1 text-xs text-muted-foreground outline-none ring-1 ring-border hover:bg-accent"
      >
        <option value="paragraph">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="bullet">Liste à puces</option>
        <option value="number">Liste numérotée</option>
        <option value="check">Liste de tâches</option>
        <option value="quote">Citation</option>
      </select>

      <Divider />

      {/* Text formats */}
      <Btn active={isBold} title="Gras" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <strong>B</strong>
      </Btn>
      <Btn active={isItalic} title="Italique" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <em>I</em>
      </Btn>
      <Btn active={isUnderline} title="Souligné" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}>
        <u>U</u>
      </Btn>
      <Btn active={isStrikethrough} title="Barré" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}>
        <s>S</s>
      </Btn>
      <Btn active={isCode} title="Code inline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>
        {"</>"}
      </Btn>

      <Divider />

      {/* Alignment */}
      <Btn title="Aligner à gauche" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}>
        ≡
      </Btn>
      <Btn title="Centrer" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}>
        ≡
      </Btn>
      <Btn title="Aligner à droite" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}>
        ≡
      </Btn>
      <Btn title="Justifier" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}>
        ≡
      </Btn>

      <Divider />

      {/* Insert */}
      <Btn title="Lien" onClick={insertLink}>
        🔗
      </Btn>
      <Btn title="Séparateur horizontal" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
        ─
      </Btn>
    </div>
  );
}

function Btn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-w-7 rounded px-1.5 py-1 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 self-stretch border-l" />;
}
```

- [ ] **Step 2: Check TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/rich-text-editor-toolbar.tsx
git commit -m "feat(admin): add Lexical toolbar plugin"
```

---

### Task 6: Lexical editor component

**Files:**
- Create: `components/admin/rich-text-editor.tsx`

- [ ] **Step 1: Create `components/admin/rich-text-editor.tsx`**

```tsx
"use client";

import { useCallback, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import type { EditorState, LexicalEditor } from "lexical";
import { ToolbarPlugin } from "./rich-text-editor-toolbar";

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
  HorizontalRuleNode,
];

interface RichTextEditorProps {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function RichTextEditor({
  name,
  defaultValue,
  placeholder = "Rédigez la description du produit…",
}: RichTextEditorProps) {
  const [jsonValue, setJsonValue] = useState(defaultValue ?? "");

  // Only use defaultValue as Lexical editor state if it looks like Lexical JSON.
  // Must use a callback — passing a raw JSON string is not supported by LexicalComposer.
  const initialEditorStateJson =
    defaultValue?.trim().startsWith("{") ? defaultValue : undefined;

  const initialConfig = {
    namespace: "ProductDescription",
    nodes: EDITOR_NODES,
    onError: (error: Error) => {
      console.error("[RichTextEditor]", error);
    },
    editorState: initialEditorStateJson
      ? (editor: LexicalEditor) => {
          try {
            const state = editor.parseEditorState(initialEditorStateJson);
            editor.setEditorState(state);
          } catch {
            // Invalid JSON — start with empty editor
          }
        }
      : undefined,
  };

  const handleChange = useCallback((editorState: EditorState) => {
    setJsonValue(JSON.stringify(editorState.toJSON()));
  }, []);

  return (
    <div className="rounded-md border focus-within:ring-2 focus-within:ring-ring">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-3 text-sm outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <HorizontalRulePlugin />
        <OnChangePlugin onChange={handleChange} />
      </LexicalComposer>
      <input type="hidden" name={name} value={jsonValue} />
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors. If Lexical types are missing, check imports — all `@lexical/react/*` exports are named imports.

- [ ] **Step 3: Commit**

```bash
git add components/admin/rich-text-editor.tsx
git commit -m "feat(admin): add RichTextEditor Lexical component"
```

---

### Task 7: Wire editor into product form

**Files:**
- Modify: `components/admin/product-form-sections.tsx`

- [ ] **Step 1: Replace `<Textarea>` with `RichTextEditor` in `product-form-sections.tsx`**

Add import at the top of the file (near the other imports):

```ts
import { RichTextEditor } from "./rich-text-editor";
```

Find the description field block (lines 122–130):

```tsx
<div className="space-y-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    name="description"
    rows={5}
    defaultValue={product.description ?? ""}
  />
</div>
```

Replace with:

```tsx
<div className="space-y-2">
  <Label>Description</Label>
  <RichTextEditor
    name="description"
    defaultValue={product.description}
  />
</div>
```

Note: The `htmlFor` on `<Label>` is removed because `ContentEditable` does not have an `id` prop — the label is purely visual.

- [ ] **Step 2: Remove `Textarea` from imports if no longer used elsewhere in the file**

Check if `Textarea` is still referenced in the file (it is — for `meta_description` in the SEO section). Leave the import.

- [ ] **Step 3: Check TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and test end-to-end**

```bash
npm run dev
```

1. Open http://localhost:3000/products/[any-product-id]/edit
2. Verify the Description field shows the Lexical editor with toolbar
3. Type some text, apply bold/italic/heading
4. Click "Mettre à jour"
5. Reload the page — editor should restore the saved content
6. Open the product storefront page — description should render as HTML with formatting

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add "components/admin/product-form-sections.tsx"
git commit -m "feat(admin): replace description textarea with Lexical WYSIWYG editor"
```

---

## Final Verification

- [ ] **Run full pre-commit check**

```bash
npx tsc --noEmit && npm run lint && npm run test
```

Expected: no type errors, no lint errors, all tests pass.

- [ ] **Create PR**

```bash
gh pr create \
  --title "feat: Lexical WYSIWYG editor for product descriptions" \
  --body "Replaces plain textarea with full-featured Lexical editor in admin. Storefront renders Lexical JSON, legacy HTML, and plain text with backward compatibility. No DB migration required."
```
