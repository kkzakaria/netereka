import { lexicalJsonToHtml } from "./lexical-to-html";
import { escapeHtml, sanitizeLegacyHtml } from "./html";
import { sanitizeDescriptionHtml } from "./sanitize-html";

/**
 * Converts a stored product description to safe HTML for storefront rendering.
 *
 * Detects three formats written to the `description` column:
 * - Lexical JSON  (starts with `{`, stored by RichTextEditor)
 * - Legacy HTML   (starts with `<`, stored by an earlier plain-textarea)
 * - Plain text    (anything else, newlines converted to `<p>` / `<br>`)
 *
 * All three paths produce sanitized HTML safe for `dangerouslySetInnerHTML`.
 * Legacy HTML sanitization uses an allowlist-based regex pass; this is
 * intentionally limited to admin-authored content (not end-user input).
 *
 * `type` (the `description_type` column) selects the editor that OWNS the
 * content, and only `"html"` — whose payload is by definition raw markup that
 * must not be re-detected — routes on it alone. `"richtext"` is a claim about
 * the writer, not a guarantee about the bytes: rows predating the rich-text
 * editor, and rows patched by hand in D1, carry that type over plain text or
 * legacy HTML. Trusting the claim sent those through `JSON.parse`, which threw,
 * logged, and returned "" — the description simply vanished from the product
 * page (issue #145). So the Lexical branch is entered on the content's actual
 * shape instead. A serialized Lexical state is always a JSON object, so
 * `{`-prefixed content is exactly the set that branch should claim, and content
 * that both starts with `{` and fails to parse stays a reported anomaly rather
 * than being quietly rendered as prose.
 */
export function descriptionToHtml(raw: string, type?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Explicit type routing — double-sanitize at read time for defense-in-depth
  if (type === "html") {
    return sanitizeDescriptionHtml(trimmed);
  }

  if (trimmed.startsWith("{")) {
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
