import { lexicalJsonToHtml } from "./lexical-to-html";
import { escapeHtml, sanitizeLegacyHtml } from "./html";

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
 */
export function descriptionToHtml(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{")) {
    try {
      const state = JSON.parse(trimmed);
      if (state?.root !== undefined) {
        return lexicalJsonToHtml(state);
      }
    } catch (err) {
      console.error(
        "[description-to-html] Failed to parse/render Lexical JSON — falling back to plain text",
        err,
      );
    }
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
