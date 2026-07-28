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
 * Remove dangerous CSS constructs from a style value or <style> block body.
 * Strips @import, url(...) and expression(...) — including UNTERMINATED forms
 * (a bare `url(` with no closing paren), because browsers recover from an
 * unclosed url() and would still issue the request, so matching only the
 * balanced form would leave an exfiltration bypass.
 */
function stripDangerousCss(css: string): string {
  // The optional closing paren (\)?) makes each pattern consume BOTH balanced
  // forms — url(x) — and unterminated ones — url(x  — up to the next ")" or the
  // end of the value, so a bare `url(https://evil/…` is removed entirely rather
  // than leaving the host behind.
  return css
    .replace(/@import\b[^;]*;?/gi, "")
    .replace(/url\s*\([^)]*\)?/gi, "")
    .replace(/expression\s*\([^)]*\)?/gi, "");
}

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

  // 0. A "<" immediately followed by another "<" can never open a tag — the
  // tokenizer treats it as literal text — so escape it up front. Leaving it
  // raw let a removal splice a tag back together: in "<<x>img src=y
  // onerror=…>", dropping the disallowed <x> pushed the leading "<" against
  // the text after it and reconstituted a live <img>. Every later pass removes
  // spans that start at a "<", so this is the one adjacency they cannot
  // prevent on their own. Rendering is unchanged — a browser shows "&lt;" and
  // a literal "<" identically — and a lone "<" in prose ("5 < 10") is
  // untouched because it is not followed by another "<".
  result = result.replace(/<(?=<)/g, "&lt;");

  // 1. Remove script/iframe tags and their content entirely.
  // The attribute run stops at "<" as well as ">" ([^<>]) so a "<" that never
  // gets a matching ">" cannot make the engine re-walk the rest of the input
  // once per candidate tag; see the note above step 3 on scan discipline.
  // The "|$" fallback mirrors the <style> pass below and matches how browsers
  // treat an unterminated raw-text element: everything to the end of input is
  // element content, so it all goes. Without it, an unclosed <script> left its
  // body behind as visible text. The closing tag tolerates attributes after
  // the name (`</script foo>`), which the tokenizer also treats as a close.
  result = result.replace(/<(script|iframe)[^<>]*>[\s\S]*?(?:<\/\1(?=[\s/>])[^<>]*>|$)/gi, "");
  result = result.replace(/<(script|iframe)[^<>]*\/?>/gi, "");

  // 2. Process <style> blocks: scope selectors, block @import and url().
  // Tolerate whitespace before the closing tag's ">" — the HTML spec allows it
  // and browsers accept it — as well as a missing closing tag entirely, by
  // falling back to the end of input. Either form previously left the block
  // unmatched, so it fell through to the tag-by-tag pass below untouched.
  // Note: when the "$" branch fires (no closing tag found), the callback below
  // still appends a synthetic "</style>" to its output — the emitted markup
  // always balances even though the input didn't. That synthetic close is
  // itself just text at this point; step 3 below re-scans the whole result
  // and is what actually keeps the rest of the pipeline honest regardless of
  // how this pass reshuffled tag boundaries.
  // The attribute run is [^<>] rather than [^>] for the same scan-discipline
  // reason as step 1 — see the note above step 3.
  result = result.replace(
    /<style[^<>]*>([\s\S]*?)(?:<\/style\s*>|$)/gi,
    (_match, cssContent: string) => {
      let css = stripDangerousCss(cssContent);
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

  // 3. Process all HTML tags: strip disallowed tags, strip dangerous attributes.
  // The attribute section may be separated from the tag name by whitespace OR a
  // solidus ("/") — the HTML tokenizer treats "/" as an attribute separator, so
  // <img/src=x/onerror=alert(1)> is a valid <img> with an onerror handler. The
  // separator class MUST include "/" ([\s/]); matching only \s let such tags
  // pass through verbatim and defeated sanitization entirely (GHSA-92r4).
  //
  // The tag-name class covers every character a browser's tokenizer will fold
  // into a tag name, not just [a-zA-Z0-9]. Per the HTML tag-name tokenizer
  // state, once the first character is an ASCII letter, EVERY subsequent
  // character is appended to the tag name until whitespace, "/", or ">" is
  // seen — that includes "-", "_", ":", "." and non-ASCII characters. A tag
  // name like "my-tag" previously matched neither this regex nor ALLOWED_TAGS,
  // so it never reached the replace callback at all and passed through the
  // sanitizer completely unfiltered, attributes included.
  //
  // Scan discipline — why the runs stop at "<" and why ">" is optional.
  // Both runs below ([^\s/<>] for the name, [^<>] for the attribute section)
  // exclude "<", and the closing ">" is captured as an OPTIONAL group. Two
  // properties follow, and both matter:
  //
  //  * Every run is bounded by the next "<", and the regions those runs cover
  //    for successive candidate tags cannot overlap — a run started at one
  //    "<" always stops at or before the next one. With the trailing ">"
  //    optional the match can never fail once the leading letter is seen, so
  //    the engine never re-walks a run it has already walked. The whole pass
  //    is a single left-to-right sweep whose cost is proportional to the input
  //    length. The earlier form could re-walk the remainder of the input once
  //    per "<", which on a large stored description turned every page view
  //    into a long CPU burn inside a CPU-metered Worker.
  //
  //  * Excluding "<" from the name does NOT re-admit the class of tag the
  //    widened name class was introduced to catch. When a run stops at a "<"
  //    (or at end of input) there is no ">", so `gt` is undefined and the
  //    whole "<"-plus-name-plus-attributes fragment is DROPPED rather than
  //    matched — the fail-closed branch below. That pairing is the essential
  //    part: bounding the name is only safe when whatever exceeds the bound is
  //    removed. A dropped fragment always ends at the next "<" or at end of
  //    input, so the removal cannot splice a live tag out of the surrounding
  //    text — a tag can only start at a "<", and every "<" is examined here.
  //
  // The old trailing `\s*\/?` before ">" was dead weight: the greedy attribute
  // run already absorbs any trailing whitespace and solidus.
  result = result.replace(
    /<\/?([a-zA-Z][^\s/<>]*)((?:[\s/][^<>]*)?)(>)?/g,
    (match, tagName: string, attrsStr: string, gt: string | undefined) => {
      // No ">" reached before the next "<" or the end of input: not a complete
      // tag, so drop the fragment rather than leave a live tag start (and its
      // handlers) behind in the output.
      if (gt === undefined) return "";

      const tag = tagName.toLowerCase();
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
        let cleanValue = attrValue;
        if (attrName === "style") {
          // Inline style values were not filtered, unlike <style> blocks, so
          // style="background:url(https://evil/…)" exfiltrated visitor requests
          // on load (GHSA-m888). Strip the same dangerous CSS constructs here.
          cleanValue = stripDangerousCss(cleanValue);
        }
        const safeValue = cleanValue.replace(/"/g, "&quot;");
        attrs.push(`${attrName}="${safeValue}"`);
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
