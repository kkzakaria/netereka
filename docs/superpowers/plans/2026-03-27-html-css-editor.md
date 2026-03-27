# HTML/CSS Description Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an HTML/CSS code editor with live preview alongside the existing Lexical rich text editor for product descriptions, letting admins choose between the two.

**Architecture:** A `DescriptionEditor` wrapper component uses shadcn Tabs to switch between the existing `RichTextEditor` and a new `HtmlEditor` (CodeMirror 6 split view). A `description_type` column in the products table tracks the chosen format. HTML is sanitized server-side on save.

**Tech Stack:** CodeMirror 6, shadcn Tabs, Drizzle ORM, Vitest

---

### Task 1: Install CodeMirror dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install CodeMirror packages**

Run:
```bash
npm install codemirror @codemirror/view @codemirror/state @codemirror/lang-html @codemirror/lang-css @codemirror/language @codemirror/commands @codemirror/search
```

- [ ] **Step 2: Verify installation**

Run: `npm ls codemirror`
Expected: codemirror and all @codemirror packages listed without errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install CodeMirror 6 dependencies for HTML editor"
```

---

### Task 2: Add `description_type` column to products schema

**Files:**
- Modify: `lib/db/schema.ts:139-165`
- Modify: `lib/db/types.ts:13-39`
- Create: Drizzle migration file (auto-generated)

- [ ] **Step 1: Add column to Drizzle schema**

In `lib/db/schema.ts`, add `description_type` after the `description` column (line 145):

```typescript
// Inside the products table definition, after line 144:
  description: text("description"),
  description_type: text("description_type").notNull().default("richtext"),
  short_description: text("short_description"),
```

- [ ] **Step 2: Add field to Product interface**

In `lib/db/types.ts`, add after line 18:

```typescript
  description: string | null;
  description_type: string;
  short_description: string | null;
```

- [ ] **Step 3: Generate migration**

Run: `npm run db:generate`
Expected: A new SQL file in `drizzle/` with `ALTER TABLE products ADD COLUMN description_type text NOT NULL DEFAULT 'richtext'`

- [ ] **Step 4: Run migration locally**

Run: `npm run db:migrate`
Expected: Migration applied successfully

- [ ] **Step 5: Verify in Drizzle Studio**

Run: `npm run db:studio`
Expected: `description_type` column visible in the products table, all existing rows show `"richtext"`

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/types.ts drizzle/
git commit -m "feat(db): add description_type column to products table"
```

---

### Task 3: Create HTML sanitizer with tests (TDD)

**Files:**
- Create: `lib/utils/sanitize-html.ts`
- Create: `__tests__/unit/sanitize-html.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/unit/sanitize-html.test.ts`:

```typescript
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/unit/sanitize-html.test.ts`
Expected: FAIL — module `@/lib/utils/sanitize-html` not found

- [ ] **Step 3: Implement sanitizer**

Create `lib/utils/sanitize-html.ts`:

```typescript
const ALLOWED_TAGS = new Set([
  "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "img", "strong", "em", "u", "s",
  "br", "hr", "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "pre", "code", "style", "figure", "figcaption",
]);

const ALLOWED_ATTRS = new Set([
  "class", "style", "href", "src", "alt", "width", "height",
  "colspan", "rowspan", "target", "rel",
]);

const DANGEROUS_URI_RE = /^\s*(javascript|data|vbscript)\s*:/i;

const EVENT_HANDLER_RE = /^on[a-z]/i;

/**
 * Sanitize admin-authored HTML for product descriptions.
 *
 * - Strips disallowed tags (script, iframe, etc.)
 * - Strips event handler attributes (onclick, onerror, etc.)
 * - Validates URI schemes in href/src (blocks javascript:, data:, vbscript:)
 * - Scopes <style> blocks to .desc-{productId} to prevent CSS leakage
 * - Blocks @import and url() inside <style> blocks
 */
export function sanitizeDescriptionHtml(html: string, productId?: string): string {
  if (!html || !html.trim()) return "";

  let result = html;

  // 1. Remove script/iframe tags and their content entirely
  result = result.replace(/<(script|iframe)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Handle self-closing script/iframe
  result = result.replace(/<(script|iframe)[^>]*\/?>/gi, "");

  // 2. Process <style> blocks: scope selectors, block @import and url()
  result = result.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (_match, cssContent: string) => {
      let css = cssContent;
      // Block @import
      css = css.replace(/@import\b[^;]*;?/gi, "");
      // Block url()
      css = css.replace(/url\s*\([^)]*\)/gi, "");
      css = css.trim();
      if (!css) return "";
      // Scope selectors if productId provided
      if (productId) {
        const scopePrefix = `.desc-${productId}`;
        css = css.replace(
          /([^{}]+)\{/g,
          (_m, selectors: string) => {
            const scoped = selectors
              .split(",")
              .map((s: string) => `${scopePrefix} ${s.trim()}`)
              .join(", ");
            return `${scoped} {`;
          },
        );
      }
      return `<style>${css}</style>`;
    },
  );

  // 3. Process all HTML tags: strip disallowed tags, strip dangerous attributes
  result = result.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)\s*\/?>/g,
    (match, tagName: string, attrsStr: string) => {
      const tag = tagName.toLowerCase();
      if (tag === "style") return match; // already processed above
      if (tag === "script" || tag === "iframe") return ""; // already removed, but catch residuals

      const isClosing = match.startsWith("</");
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (isClosing) return `</${tag}>`;

      // Parse and filter attributes
      const attrs: string[] = [];
      const attrRegex = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

        // Block event handlers
        if (EVENT_HANDLER_RE.test(attrName)) continue;
        // Block disallowed attributes
        if (!ALLOWED_ATTRS.has(attrName)) continue;
        // Validate URI-bearing attributes
        if ((attrName === "href" || attrName === "src") && DANGEROUS_URI_RE.test(attrValue)) continue;

        attrs.push(`${attrName}="${attrValue}"`);
      }

      const isSelfClosing = tag === "br" || tag === "hr" || tag === "img";
      const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
      return isSelfClosing ? `<${tag}${attrString}>` : `<${tag}${attrString}>`;
    },
  );

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/sanitize-html.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils/sanitize-html.ts "__tests__/unit/sanitize-html.test.ts"
git commit -m "feat: add HTML sanitizer for product descriptions (TDD)"
```

---

### Task 4: Update `descriptionToHtml` to accept `description_type` (TDD)

**Files:**
- Modify: `lib/utils/description-to-html.ts`
- Modify: `__tests__/unit/lexical-to-html.test.ts` (or create new test file)
- Modify: `components/storefront/product-details.tsx:62-72`

- [ ] **Step 1: Write failing tests for the new signature**

Add a new test file `__tests__/unit/description-to-html.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { descriptionToHtml } from "@/lib/utils/description-to-html";

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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/unit/description-to-html.test.ts`
Expected: FAIL — `descriptionToHtml` does not accept a second parameter, and `"html"` type is not handled

- [ ] **Step 3: Update `descriptionToHtml` to accept `description_type`**

Replace the full content of `lib/utils/description-to-html.ts`:

```typescript
import { lexicalJsonToHtml } from "./lexical-to-html";
import { escapeHtml, sanitizeLegacyHtml } from "./html";

/**
 * Converts a stored product description to safe HTML for storefront rendering.
 *
 * When `type` is provided, it routes directly:
 * - `"richtext"` → Lexical JSON converter
 * - `"html"`     → returns pre-sanitized HTML as-is
 *
 * When `type` is omitted (backward compat), falls back to heuristic detection:
 * - Starts with `{` → Lexical JSON
 * - Starts with `<` → legacy HTML (sanitized)
 * - Otherwise       → plain text
 */
export function descriptionToHtml(raw: string, type?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Explicit type routing
  if (type === "html") {
    return trimmed;
  }

  if (type === "richtext" || trimmed.startsWith("{")) {
    let state: unknown;
    try {
      state = JSON.parse(trimmed);
    } catch (err) {
      console.error("[description-to-html] JSON.parse failed — returning empty", err, { prefix: trimmed.slice(0, 80) });
      return "";
    }
    if (state != null && typeof state === "object" && "root" in state) {
      try {
        return lexicalJsonToHtml(state as Parameters<typeof lexicalJsonToHtml>[0]);
      } catch (err) {
        console.error("[description-to-html] lexicalJsonToHtml threw unexpectedly — returning empty", err, { prefix: trimmed.slice(0, 80) });
        return "";
      }
    }
    console.error("[description-to-html] JSON parsed but has no root key — not a valid Lexical state", { prefix: trimmed.slice(0, 80) });
    return "";
  }

  if (trimmed.startsWith("<")) {
    try {
      return sanitizeLegacyHtml(trimmed);
    } catch (err) {
      console.error(
        "[description-to-html] sanitizeLegacyHtml threw unexpectedly — falling back to escaped plain text",
        err,
      );
      return escapeHtml(trimmed);
    }
  }

  // Plain text: escape then wrap in paragraphs
  return trimmed
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/description-to-html.test.ts __tests__/unit/lexical-to-html.test.ts`
Expected: All tests PASS (both old and new)

- [ ] **Step 5: Update storefront callsite**

In `components/storefront/product-details.tsx`, update the `DescriptionContent` component to pass `description_type`. First, find where the component receives its props and add the type parameter.

The `DescriptionContent` component (line 62) needs to accept `descriptionType`:

```typescript
function DescriptionContent({ description, descriptionType }: { description: string | null; descriptionType?: string }) {
  if (!description) return null;
  const html = descriptionToHtml(description, descriptionType);
  if (!html) return null;
  return (
    <div
      className="prose prose-sm max-w-prose dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

Update the callsite(s) of `DescriptionContent` to pass `descriptionType={product.description_type}`. The parent component already has the full `ProductDetail` object, so this is just prop threading.

- [ ] **Step 6: Commit**

```bash
git add lib/utils/description-to-html.ts "__tests__/unit/description-to-html.test.ts" "components/storefront/product-details.tsx"
git commit -m "feat: route descriptionToHtml by explicit description_type"
```

---

### Task 5: Create the HtmlEditor component

**Files:**
- Create: `components/admin/html-editor.tsx`
- Create: `components/admin/html-editor.css`

- [ ] **Step 1: Create the CSS file for split-view layout**

Create `components/admin/html-editor.css`:

```css
.html-editor-container {
  display: flex;
  gap: 0;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 400px;
}

.html-editor-code {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.html-editor-code .cm-editor {
  height: 100%;
}

.html-editor-code .cm-editor .cm-scroller {
  overflow: auto;
}

.html-editor-code .cm-editor.cm-focused {
  outline: none;
}

.html-editor-preview {
  flex: 1;
  min-width: 0;
  border-left: 1px solid hsl(var(--border));
}

.html-editor-preview iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

/* Mobile: stack vertically or show toggle */
@media (max-width: 767px) {
  .html-editor-container {
    flex-direction: column;
  }
  .html-editor-preview {
    border-left: none;
    border-top: 1px solid hsl(var(--border));
  }
  .html-editor-container[data-fullscreen="true"] .html-editor-preview {
    display: none;
  }
}
```

- [ ] **Step 2: Create the HtmlEditor component**

Create `components/admin/html-editor.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { ViewUpdate } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import "./html-editor.css";

interface HtmlEditorProps {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function HtmlEditor({ name, defaultValue, placeholder }: HtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updatePreview = useCallback((content: string) => {
    const iframe = previewRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;padding:16px;margin:0;color:#1a1a1a;line-height:1.6}img{max-width:100%;height:auto}</style>
</head>
<body>${content}</body>
</html>`);
    doc.close();
  }, []);

  const onUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.docChanged) return;
      const content = update.state.doc.toString();
      if (hiddenRef.current) hiddenRef.current.value = content;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updatePreview(content), 300);
    },
    [updatePreview],
  );

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const startDoc = defaultValue ?? "";
    const state = EditorState.create({
      doc: startDoc,
      extensions: [
        basicSetup,
        html(),
        css(),
        EditorView.updateListener.of(onUpdate),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
        placeholder ? EditorView.contentAttributes.of({ "aria-placeholder": placeholder }) : [],
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    if (hiddenRef.current) hiddenRef.current.value = startDoc;
    // Initial preview
    updatePreview(startDoc);
    setMounted(true);

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? "Afficher preview" : "Masquer preview"}
        </Button>
      </div>
      <div
        className="html-editor-container"
        data-fullscreen={isFullscreen}
        style={{ opacity: mounted ? 1 : 0 }}
      >
        <div className="html-editor-code" ref={editorRef} />
        <div className="html-editor-preview">
          <iframe
            ref={previewRef}
            sandbox="allow-styles"
            title="Preview HTML"
          />
        </div>
      </div>
      <input type="hidden" name={name} ref={hiddenRef} />
    </div>
  );
}
```

- [ ] **Step 3: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No type errors related to the new component

- [ ] **Step 4: Commit**

```bash
git add components/admin/html-editor.tsx components/admin/html-editor.css
git commit -m "feat(admin): add HtmlEditor component with CodeMirror split view"
```

---

### Task 6: Create the DescriptionEditor wrapper component

**Files:**
- Create: `components/admin/description-editor.tsx`

- [ ] **Step 1: Create the wrapper component**

Create `components/admin/description-editor.tsx`:

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { lexicalJsonToHtml } from "@/lib/utils/lexical-to-html";

const RichTextEditor = dynamic(
  () => import("@/components/admin/rich-text-editor").then((m) => m.RichTextEditor),
);
const HtmlEditor = dynamic(
  () => import("@/components/admin/html-editor").then((m) => m.HtmlEditor),
);

interface DescriptionEditorProps {
  name: string;
  descriptionType?: string;
  defaultValue?: string | null;
  placeholder?: string;
}

export function DescriptionEditor({
  name,
  descriptionType = "richtext",
  defaultValue,
  placeholder,
}: DescriptionEditorProps) {
  const [activeTab, setActiveTab] = useState<string>(descriptionType);
  const [richValue, setRichValue] = useState<string | null>(
    descriptionType === "richtext" ? (defaultValue ?? null) : null,
  );
  const [htmlValue, setHtmlValue] = useState<string>(
    descriptionType === "html" ? (defaultValue ?? "") : "",
  );
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const richKeyRef = useRef(0);
  const htmlKeyRef = useRef(0);

  const handleTabChange = useCallback(
    (newTab: string) => {
      if (newTab === activeTab) return;

      if (newTab === "html" && activeTab === "richtext") {
        // Richtext → HTML: convert Lexical JSON to HTML for pre-fill
        setDialogMessage(
          "Le contenu de l'éditeur riche sera converti en HTML. Certains détails de mise en forme pourraient être simplifiés.",
        );
        setPendingTab(newTab);
        setDialogOpen(true);
        return;
      }

      if (newTab === "richtext" && activeTab === "html") {
        // HTML → Richtext: warn about loss
        setDialogMessage(
          "Le contenu HTML sera importé en texte brut dans l'éditeur riche. Les styles CSS et la mise en page avancée seront perdus.",
        );
        setPendingTab(newTab);
        setDialogOpen(true);
        return;
      }
    },
    [activeTab],
  );

  const confirmSwitch = useCallback(() => {
    if (!pendingTab) return;

    if (pendingTab === "html") {
      // Convert Lexical JSON → HTML
      // Read current richtext value from the hidden input
      const hiddenInput = document.querySelector<HTMLInputElement>(
        `input[type="hidden"][name="${name}"]`,
      );
      const currentJson = hiddenInput?.value ?? richValue ?? "";
      let converted = "";
      if (currentJson.trim().startsWith("{")) {
        try {
          const state = JSON.parse(currentJson);
          if (state?.root) {
            converted = lexicalJsonToHtml(state);
          }
        } catch {
          converted = "";
        }
      }
      setHtmlValue(converted);
      htmlKeyRef.current += 1;
    } else if (pendingTab === "richtext") {
      // HTML → Richtext: strip tags, pass as plain text
      const stripped = htmlValue.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      setRichValue(stripped || null);
      richKeyRef.current += 1;
    }

    setActiveTab(pendingTab);
    setPendingTab(null);
    setDialogOpen(false);
  }, [pendingTab, name, richValue, htmlValue]);

  const cancelSwitch = useCallback(() => {
    setPendingTab(null);
    setDialogOpen(false);
  }, []);

  return (
    <>
      <input type="hidden" name="description_type" value={activeTab} />
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="richtext">Éditeur riche</TabsTrigger>
          <TabsTrigger value="html">HTML / CSS</TabsTrigger>
        </TabsList>
        <TabsContent value="richtext" className="mt-3">
          <RichTextEditor
            key={richKeyRef.current}
            name={name}
            defaultValue={richValue}
            placeholder={placeholder}
          />
        </TabsContent>
        <TabsContent value="html" className="mt-3">
          <HtmlEditor
            key={htmlKeyRef.current}
            name={name}
            defaultValue={htmlValue}
            placeholder={placeholder ?? "Saisissez votre HTML ici…"}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer d&apos;éditeur</AlertDialogTitle>
            <AlertDialogDescription>{dialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSwitch}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/description-editor.tsx
git commit -m "feat(admin): add DescriptionEditor wrapper with tab switching"
```

---

### Task 7: Integrate DescriptionEditor into product forms

**Files:**
- Modify: `components/admin/product-form-sections.tsx:21,205-211`
- Modify: `components/admin/product-wizard/step-finalization.tsx:12-14,82-86`

- [ ] **Step 1: Update product-form-sections.tsx**

Replace the import (line 21):

```typescript
// Remove this line:
import { RichTextEditor } from "./rich-text-editor";
// Add this line:
import { DescriptionEditor } from "./description-editor";
```

Replace the description section (lines 205-211):

```tsx
              <div className="space-y-2">
                <Label>Description</Label>
                <DescriptionEditor
                  name="description"
                  descriptionType={product.description_type}
                  defaultValue={product.description}
                />
              </div>
```

- [ ] **Step 2: Update step-finalization.tsx**

Replace the dynamic import (lines 12-14):

```typescript
// Remove:
const RichTextEditor = dynamic(() =>
  import("@/components/admin/rich-text-editor").then((m) => m.RichTextEditor),
);
// Add:
const DescriptionEditor = dynamic(() =>
  import("@/components/admin/description-editor").then((m) => m.DescriptionEditor),
);
```

Replace the description section (lines 82-86):

```tsx
      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        <DescriptionEditor
          name="description"
          descriptionType={product.description_type}
          defaultValue={product.description}
        />
      </div>
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add components/admin/product-form-sections.tsx "components/admin/product-wizard/step-finalization.tsx"
git commit -m "feat(admin): integrate DescriptionEditor into product forms"
```

---

### Task 8: Update server actions to persist `description_type` and sanitize HTML

**Files:**
- Modify: `actions/admin/products.ts:16-31,156-163,517-541`

- [ ] **Step 1: Add `description_type` to `productSchema`**

In `actions/admin/products.ts`, add to the schema (after line 20):

```typescript
const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand: z.string().optional().default(""),
  description: z.string().optional().default(""),
  description_type: z.enum(["richtext", "html"]).optional().default("richtext"),
  short_description: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0, "Le prix doit être positif"),
  compare_price: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  weight_grams: z.coerce.number().int().min(0).optional(),
  meta_title: z.string().max(60).optional().default(""),
  meta_description: z.string().max(160).optional().default(""),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  is_featured: z.coerce.number().int().min(0).max(1).default(0),
});
```

- [ ] **Step 2: Add import for sanitizer**

Add at the top of the file (after line 9):

```typescript
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
```

- [ ] **Step 3: Update `updateProduct` SQL to include `description_type`**

Update the SQL string at line 156:

```typescript
  const updateSql = `UPDATE products SET
     category_id = ?, name = ?, slug = ?, description = ?, description_type = ?,
     short_description = ?,
     base_price = ?, compare_price = ?, sku = ?, brand = ?,
     is_active = ?, is_featured = ?, stock_quantity = ?,
     low_stock_threshold = ?, weight_grams = ?, meta_title = ?, meta_description = ?,
     is_draft = 0,
     updated_at = datetime('now')
   WHERE id = ?`;
```

Update the `buildParams` function to include description_type and sanitize HTML. Insert the sanitization logic before `buildParams`:

```typescript
  // Sanitize HTML description before storage
  const finalDescription = data.description_type === "html" && data.description
    ? sanitizeDescriptionHtml(data.description, id)
    : data.description || null;

  const buildParams = (sku: string) => [
    data.category_id,
    data.name,
    finalSlug,
    finalDescription,
    data.description_type,
    data.short_description || null,
    data.base_price,
    data.compare_price ?? null,
    sku,
    data.brand || null,
    data.is_active,
    data.is_featured,
    data.stock_quantity,
    data.low_stock_threshold,
    data.weight_grams ?? null,
    data.meta_title || null,
    data.meta_description || null,
    id,
  ];
```

- [ ] **Step 4: Update `saveDraftStep` step 5 to include `description_type`**

In the step 5 block (around line 517), add `description_type` to the Zod schema:

```typescript
  if (step === "5") {
    const parsed = z
      .object({
        short_description: z.string().optional().default(""),
        description: z.string().optional().default(""),
        description_type: z.enum(["richtext", "html"]).optional().default("richtext"),
        meta_title: z
          .string()
          .max(60, "Le titre SEO ne peut pas dépasser 60 caractères")
          .optional()
          .default(""),
        meta_description: z
          .string()
          .max(160, "La méta-description ne peut pas dépasser 160 caractères")
          .optional()
          .default(""),
        is_active: z.coerce.number().int().min(0).max(1).default(0),
        is_featured: z.coerce.number().int().min(0).max(1).default(0),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
      };

    // Sanitize HTML description before storing draft
    if (parsed.data.description_type === "html" && parsed.data.description) {
      parsed.data.description = sanitizeDescriptionHtml(parsed.data.description, id);
    }

    return applyDraftUpdate(id, parsed.data, product.slug);
  }
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add actions/admin/products.ts
git commit -m "feat(admin): persist description_type and sanitize HTML on save"
```

---

### Task 9: Update storefront CSS scoping for HTML descriptions

**Files:**
- Modify: `components/storefront/product-details.tsx`

- [ ] **Step 1: Add CSS scoping wrapper for HTML descriptions**

Update the `DescriptionContent` component to wrap HTML descriptions with a scoped class:

```typescript
function DescriptionContent({
  description,
  descriptionType,
  productId,
}: {
  description: string | null;
  descriptionType?: string;
  productId?: string;
}) {
  if (!description) return null;
  const html = descriptionToHtml(description, descriptionType);
  if (!html) return null;

  const scopeClass = descriptionType === "html" && productId
    ? `desc-${productId}`
    : undefined;

  return (
    <div
      className={`prose prose-sm max-w-prose dark:prose-invert ${scopeClass ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

Update the callsite(s) to pass `productId` and `descriptionType` props from the product object.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add "components/storefront/product-details.tsx"
git commit -m "feat(storefront): add CSS scoping for HTML descriptions"
```

---

### Task 10: Run full test suite and verify

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 2: Run type checking**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Manual testing checklist**

1. Open admin product edit form → verify tabs "Éditeur riche" / "HTML / CSS" appear
2. Default is "Éditeur riche" for existing products
3. Switch to "HTML / CSS" → confirmation dialog appears → CodeMirror editor loads with converted HTML
4. Type HTML in CodeMirror → live preview updates in iframe
5. Save → reload → HTML content persists, tab selection remembered
6. Switch back to "Éditeur riche" → warning dialog → content converted to plain text
7. Open product wizard step 5 → same tabs appear
8. View product on storefront → HTML description renders correctly
9. Verify `<script>` tags are stripped on save
10. Test on mobile viewport → editors stack vertically
