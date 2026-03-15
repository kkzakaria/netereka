# Rich Text Product Description — Design Spec

**Date:** 2026-03-13
**Status:** Approved

## Problem

Product descriptions are stored as raw HTML (or plain text) in the D1 database but rendered as literal text on the storefront — HTML tags are visible to users. There is no WYSIWYG editor in the admin, so admins cannot create formatted content.

## Goals

1. Render descriptions as formatted HTML on the product detail page (storefront).
2. Replace the plain `<Textarea>` in the admin product form with a full-featured WYSIWYG editor (Lexical by Meta).
3. Maintain backward compatibility with descriptions already stored as plain text or raw HTML.

## Out of Scope

- Rich text for any field other than `products.description`
- Image upload within the editor (inline images)
- Collaborative editing

---

## Section 1 — Storage Format

**Format: Lexical JSON state**

Descriptions are stored as Lexical's native JSON serialisation in the existing `description text` column of the `products` table. No schema migration is required.

**Rationale:**
- Storefront (high traffic): server-side JSON→HTML conversion via a custom DOM-free serialiser is negligible CPU on Cloudflare Workers.
- Admin (low traffic): Lexical loads its native state directly — instantaneous, zero parsing loss, perfect round-trip fidelity.
- Storing raw HTML would require Lexical to re-parse HTML on every admin load, which is less accurate for complex structures.

**Backward compatibility:**
The renderer detects the stored format at render time:
- Lexical JSON → parse and convert to HTML via a custom DOM-free tree-walker (no `@lexical/html`, see Section 3)
- Legacy raw HTML → render directly with `dangerouslySetInnerHTML` after sanitisation
- Plain text → HTML-escape then wrap in `<p>` tags

---

## Section 2 — Admin WYSIWYG Editor

### New component

`components/admin/rich-text-editor.tsx` — a `"use client"` component wrapping Lexical.

### Toolbar (complete)

| Category | Features |
|---|---|
| Text formatting | Bold, Italic, Underline, Strikethrough, Inline code |
| Headings | H1, H2, H3 |
| Lists | Bullet, Numbered, Task/Checklist |
| Alignment | Left, Center, Right, Justify |
| Blocks | Blockquote, Code block, Horizontal rule |
| Links | URL dialog |
| History | Undo, Redo |

### Form integration

The component receives `name="description"` and `defaultValue={product.description ?? ""}`. It maintains a hidden `<input type="hidden" name="description">` that is synchronised with the Lexical editor state (JSON) on every change. This integrates transparently with the existing Server Actions — no changes to `actions/admin/*.ts` are required.

### Packages required

```
lexical
@lexical/react
@lexical/rich-text
@lexical/list
@lexical/link
@lexical/code
@lexical/history
```

Note: `@lexical/html`, `@lexical/table`, and `@lexical/markdown` are excluded. `@lexical/html` cannot run on Cloudflare Workers (requires a DOM / `document` global). Tables and Markdown are out of scope.

### Styling

- Toolbar styled with Tailwind CSS + project CSS variables (navy/mint, `border`, `rounded`, `bg-background`) to match the existing shadcn/ui admin aesthetic.
- Editor content area uses `min-h-[200px]`, `border`, `rounded-b`, `p-3`, `text-sm`.
- Active toolbar buttons use `bg-accent` / `text-accent-foreground` to indicate active state.

### Loading

`product-form-sections.tsx` is already a `"use client"` component. `RichTextEditor` is imported normally — no dynamic import with `{ ssr: false }` is needed.

---

## Section 3 — Storefront Renderer

### Custom DOM-free JSON→HTML serialiser

`@lexical/html`'s `$generateHtmlFromNodes` requires a `document` global and calls DOM APIs internally. Cloudflare Workers has no DOM — this function throws at runtime.

Instead, a small custom serialiser (`lib/utils/lexical-to-html.ts`) walks the Lexical JSON tree recursively and emits HTML strings using string concatenation — no DOM APIs required. This is ~100–150 lines covering the node types produced by the editor toolbar defined in Section 2:

- `paragraph` → `<p>`
- `heading` (h1–h3) → `<h1>`–`<h3>`
- `list` (bullet/number/check) → `<ul>` / `<ol>` / `<ul class="checklist">` + `<li>`
- `quote` → `<blockquote>`
- `code` → `<pre><code>`
- `horizontalrule` → `<hr>`
- `link` → `<a href="..." rel="noopener noreferrer">`
- `text` node with format flags → wrap in `<strong>`, `<em>`, `<u>`, `<s>`, `<code>` as needed
- `linebreak` → `<br>`

Unknown node types are safely ignored (emit nothing).

### Updated `DescriptionContent`

`DescriptionContent` in `components/storefront/product-details.tsx` becomes a synchronous function that calls `descriptionToHtml(raw)`:

```ts
function descriptionToHtml(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // Lexical JSON — must try/catch for robustness
  if (trimmed.startsWith("{")) {
    try {
      const state = JSON.parse(trimmed);
      if (state?.root !== undefined) {
        return lexicalJsonToHtml(state); // custom DOM-free serialiser
      }
    } catch {
      // fall through
    }
  }

  // Legacy raw HTML
  if (trimmed.startsWith("<")) {
    return sanitizeLegacyHtml(trimmed); // regex allowlist (see below)
  }

  // Plain text fallback — must HTML-escape before insertion
  return trimmed
    .split(/\n{2,}/)
    .map((p) =>
      `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}
```

### Sanitisation of legacy HTML

`isomorphic-dompurify` requires JSDom which is incompatible with Cloudflare Workers. Instead, a simple regex-based allowlist (`sanitizeLegacyHtml`) is used. It strips any tags not in the allowlist (`p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `ul`, `ol`, `li`, `h1`, `h2`, `h3`, `blockquote`, `code`, `pre`, `hr`, `a`) and strips any attributes other than `href` on `<a>` tags (validated to start with `http`/`https`/`mailto`). Since the legacy HTML in the database is authored by admin users (not arbitrary end-user input), this allowlist is sufficient.

`escapeHtml` is a tiny helper: replaces `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`.

### Prose styling

The container div receives Tailwind Typography classes (`prose prose-sm max-w-prose dark:prose-invert`) so that headings, lists, bold text, blockquotes, and code blocks are rendered with consistent, readable styles without custom CSS.

**Dependency:** `@tailwindcss/typography` plugin. In Tailwind CSS 4 (this project), plugins are registered via an `@plugin` directive in `app/globals.css` — there is no `tailwind.config.ts`:

```css
/* app/globals.css */
@plugin "@tailwindcss/typography";
```

---

## Files Changed

| File | Change |
|---|---|
| `components/admin/rich-text-editor.tsx` | New — Lexical WYSIWYG editor component |
| `components/admin/product-form-sections.tsx` | Replace `<Textarea>` for `description` with `RichTextEditor` |
| `components/storefront/product-details.tsx` | Update `DescriptionContent` to detect format and render HTML |
| `lib/utils/lexical-to-html.ts` | New — DOM-free Lexical JSON→HTML serialiser |
| `lib/utils/html.ts` | New (or extend existing) — `escapeHtml`, `sanitizeLegacyHtml` helpers |
| `app/globals.css` | Add `@plugin "@tailwindcss/typography"` |
| `package.json` | Add Lexical packages + `@tailwindcss/typography` |

## Files Unchanged

- `lib/db/schema.ts` — no schema change
- `drizzle/` — no migration needed
- `actions/admin/*.ts` — no server action change
- `app/(storefront)/p/[slug]/page.tsx` — no change
