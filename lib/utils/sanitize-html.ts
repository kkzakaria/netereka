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
 */
const MAX_INPUT_LENGTH = 512_000; // 500KB — reject oversized input

export function sanitizeDescriptionHtml(html: string, productId?: string): string {
  if (!html || !html.trim()) return "";
  if (html.length > MAX_INPUT_LENGTH) {
    console.error("[sanitize-html] Input exceeds max length — returning empty (fail-closed)", { length: html.length, productId });
    return "";
  }

  try {

  let result = html;

  // 1. Remove script/iframe tags and their content entirely
  result = result.replace(/<(script|iframe)[^>]*>[\s\S]*?<\/\1>/gi, "");
  result = result.replace(/<(script|iframe)[^>]*\/?>/gi, "");

  // 2. Process <style> blocks: scope selectors, block @import and url()
  result = result.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (_match, cssContent: string) => {
      let css = cssContent;
      css = css.replace(/@import\b[^;]*;?/gi, "");
      css = css.replace(/url\s*\([^)]*\)/gi, "");
      css = css.trim();
      if (!css) return "";
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
      if (tag === "style") return match; // already processed
      if (tag === "script" || tag === "iframe") return "";

      const isClosing = match.startsWith("</");
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (isClosing) return `</${tag}>`;

      const attrs: string[] = [];
      const attrRegex = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
        if (EVENT_HANDLER_RE.test(attrName)) continue;
        if (!ALLOWED_ATTRS.has(attrName)) continue;
        if ((attrName === "href" || attrName === "src") && DANGEROUS_URI_RE.test(attrValue)) continue;
        attrs.push(`${attrName}="${attrValue}"`);
      }

      const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
      return `<${tag}${attrString}>`;
    },
  );

  return result;

  } catch (err) {
    console.error("[sanitize-html] Sanitization failed — returning empty (fail-closed)", err, { productId, inputLength: html.length });
    return "";
  }
}
