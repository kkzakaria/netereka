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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
