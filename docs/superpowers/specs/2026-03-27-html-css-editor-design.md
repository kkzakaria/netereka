# HTML/CSS Editor for Product Descriptions

**Date:** 2026-03-27
**Status:** Approved

## Problem

The admin product forms only offer a Lexical-based rich text editor for descriptions. Admins need pixel-perfect control over rendering (custom layouts, CSS styling), the ability to paste HTML from supplier datasheets or other sites, and the option to use pre-built HTML templates (promo banners, spec tables). The rich text editor cannot support these use cases.

## Solution

Add an HTML/CSS code editor (CodeMirror 6) with live preview alongside the existing rich text editor. Admins choose between the two via a tab selector. The chosen format is persisted via a `description_type` column in the database.

## Design

### 1. Schema & Storage

- Add column `description_type TEXT NOT NULL DEFAULT 'richtext'` to the `products` table
  - Values: `"richtext"` | `"html"`
- The existing `description` column stores either Lexical JSON or raw HTML depending on type
- `descriptionToHtml()` uses `description_type` parameter instead of the current heuristic (detecting format by first character)
- Standard Drizzle migration: edit schema → `db:generate` → `db:migrate`
- **Backward compatibility:** All existing products default to `description_type = 'richtext'` — nothing breaks

### 2. HtmlEditor Component

**Library:** CodeMirror 6 (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-html`, `@codemirror/lang-css`, `codemirror`)

Chosen over Monaco (~2MB) for its lightweight footprint (~150KB gzipped) and modularity.

**Layout — Split View:**
- Left panel: CodeMirror editor with HTML/CSS syntax highlighting
- Right panel: live preview rendered in a sandboxed iframe
- Preview updates in real-time (debounced ~300ms) on each keystroke
- Toggle button switches between split view and full-screen editor on mobile (< 768px)

**Props:**
```typescript
interface HtmlEditorProps {
  name: string;           // hidden input field name for form submission
  defaultValue?: string;  // initial HTML content
  placeholder?: string;
}
```

**Features included:**
- HTML + CSS syntax highlighting (inline `<style>` recognized)
- Line numbers
- Auto-indentation
- Find/Replace (Ctrl+F, native CodeMirror)
- Live preview in `<iframe sandbox="allow-styles">` (no JS execution)
- Sync via `<input type="hidden" name={name}>` (same pattern as RichTextEditor)

**Not included (YAGNI):** advanced autocompletion, HTML linting, Emmet mode.

### 3. Editor Selector & Form Integration

**DescriptionEditor component** wraps both editors behind shadcn `Tabs`:
- Tab "Éditeur riche" → RichTextEditor (existing)
- Tab "HTML/CSS" → HtmlEditor (new)
- Hidden input `<input type="hidden" name="description_type">` persists the selection

**Switch behavior:**
- **Richtext → HTML:** Convert Lexical JSON to HTML via `lexicalToHtml()` (existing DOM-free function, browser-compatible) to pre-fill the HTML editor. Confirmation dialog before switching.
- **HTML → Richtext:** Warning: "Le contenu HTML sera importé en texte brut dans l'éditeur riche. Les styles CSS et la mise en page avancée seront perdus." Admin confirms or cancels. If confirmed, HTML tags are stripped and content injected as plain text (same behavior as existing legacy HTML handling).

**Form integration:**
- `product-form-sections.tsx`: replace `<RichTextEditor>` with `<DescriptionEditor>`
- `step-finalization.tsx` (wizard): same replacement
- `DescriptionEditor` handles dynamic imports of both editors (lazy loading)

**Templates:** V1 ships without a built-in template library in the UI. 2-3 starter templates (spec table, promo banner, detailed product sheet) will be documented in a markdown reference file for copy-paste. UI template picker deferred to V2.

### 4. Security & Storefront Rendering

**HTML sanitization (server-side, on save):**
- Allowlisted tags: `p`, `div`, `span`, `h1`-`h6`, `ul`, `ol`, `li`, `a`, `img`, `strong`, `em`, `u`, `s`, `br`, `hr`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `blockquote`, `pre`, `code`, `style`, `figure`, `figcaption`
- Allowlisted attributes: `class`, `style`, `href`, `src`, `alt`, `width`, `height`, `colspan`, `rowspan`, `target`, `rel`
- Blocked: `<script>`, `<iframe>`, event handlers (`onclick`, `onerror`, etc.), `javascript:` / `data:` URI schemes
- Sanitization runs in the server action at save time, not client-side

**Storefront rendering:**
- `descriptionToHtml()` receives `description_type` as parameter
- `"html"` → return HTML as-is (already sanitized at save)
- `"richtext"` → existing Lexical JSON converter
- Rendered via `dangerouslySetInnerHTML` in `<div className="prose">` (unchanged)

**CSS scoping:**
- Inline `style="..."` attributes allowed on permitted tags
- `<style>` blocks are scoped: selectors prefixed with `.desc-{productId}` to prevent style leakage
- `@import` and `url()` blocked inside `<style>` blocks

### 5. Files Impacted

**New files:**
| File | Purpose |
|------|---------|
| `components/admin/html-editor.tsx` | CodeMirror split-view component |
| `components/admin/html-editor.css` | Split-view layout styles |
| `components/admin/description-editor.tsx` | Tab wrapper (richtext / html) |
| `lib/utils/sanitize-html.ts` | Server-side HTML sanitization |

**Modified files:**
| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add `description_type` column |
| `lib/db/types.ts` | Add `description_type` to Product interfaces |
| `lib/utils/description-to-html.ts` | Accept `description_type` param instead of guessing |
| `components/admin/product-form-sections.tsx` | Replace RichTextEditor with DescriptionEditor |
| `components/admin/product-wizard/step-finalization.tsx` | Same replacement |
| `actions/admin/products.ts` | Persist `description_type`, sanitize HTML on save |
| Storefront callsites of `descriptionToHtml()` | Pass `description_type` |

**npm dependencies:**
- `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-html`, `@codemirror/lang-css`, `codemirror`

### 6. Testing

- Unit tests for `sanitize-html.ts`: blocked tags, blocked attributes, blocked URI schemes, CSS scoping
- Updated unit tests for `descriptionToHtml()`: routing by `description_type`
- Manual testing: switch between editors, save/reload, storefront rendering

## Out of Scope

- Built-in template library UI (V2)
- Autocompletion / Emmet in the HTML editor
- HTML linting / validation
- Collaborative editing
- HTML editor for fields other than product description
