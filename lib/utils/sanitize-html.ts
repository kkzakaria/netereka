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
 *  produce a character that can extend a scheme or a function name.
 *
 *  A Map, not an object literal, and the difference is not stylistic. A plain
 *  object inherits from Object.prototype, so a lookup for a name that happens
 *  to be spelled like one of its members answers with that member instead of
 *  `undefined`. Exactly one such name is reachable through the reference
 *  grammar below (`[a-z][a-z0-9]{1,31}` admits `constructor` and nothing else
 *  on the prototype), and `&constructor;` therefore decoded to
 *  "function Object() { [native code] }" — a reference the HTML spec does not
 *  define, decoded to text no browser produces.
 *
 *  Nothing was exploitable through it: the injected text carries no ":" and
 *  joins no characters together, so every reachable case had the filter and
 *  the browser agreeing on the verdict anyway (`&constructor;javascript:` is a
 *  relative URL to both; `ur&constructor;l(` is not `url(` to either). But the
 *  premise of this whole file is that the filter reads what the browser reads,
 *  and here it demonstrably did not. A Map has no inherited keys, so the
 *  question cannot arise again.
 *
 *  There is deliberately NO test for this, and that is worth stating so nobody
 *  reads the gap as an oversight. The decoder's output is used to reach a
 *  verdict and is never emitted, and in every reachable case the verdict was
 *  the same either way — so the difference is invisible through this module's
 *  public surface. Three assertions were written for it and all three passed
 *  against the unfixed table; they were removed rather than kept, because a
 *  test that cannot fail is worse than no test. The guarantee here is
 *  structural instead: a Map cannot answer for a name it was not given. */
const NAMED_CHARACTER_REFERENCES = new Map<string, string>(Object.entries({
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
}));

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
      return NAMED_CHARACTER_REFERENCES.get((name as string).toLowerCase()) ?? match;
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
 *
 * ---------------------------------------------------------------------------
 * KNOWN CONTENT LOSS — read this before debugging "my description is truncated"
 * ---------------------------------------------------------------------------
 * This function is not lossless, and the losses below are deliberate. They are
 * the price of failing closed on input this filter cannot model as confidently
 * as a browser would. None of them can be softened without reopening a way
 * through, so the answer to a report of missing content is to change the
 * SOURCE, not this file.
 *
 * **1. A `<` followed by an ASCII letter discards everything up to the next
 * `<`, or to the end of the input.**
 *
 * That sequence is how a tag starts, so the filter reads it as one. If no `>`
 * arrives before the next `<`, it is not a complete tag and the fragment is
 * dropped rather than emitted (see the `gt === undefined` branch in step 3).
 * The consequence is easiest to see in code samples:
 *
 * ```
 *   in : <pre><code>for(i=0;i<n;i++){}</code></pre>
 *   out: <pre><code>for(i=0;i</code></pre>
 * ```
 *
 * `i<n` opens what looks like a `<n…>` tag, and `;i++){}` disappears with it.
 * A 2,686-byte description built this way was measured losing 2,623 bytes.
 *
 * A lone `<` in ordinary prose is untouched — `5 < 10` is safe, because the
 * `<` is followed by a space rather than a letter. Only the letter case bites.
 *
 * **Exposure was measured, not assumed:** 0 of 568 non-empty descriptions in
 * production are affected, and the seven products carrying generated `<style>`
 * blocks are byte-identical before and after. The day a seller writes a
 * technical spec containing `i<n`, the fix is to write `i&lt;n` in the source
 * — which is what the HTML spec asks for anyway — not to relax the filter.
 *
 * **2. A `<` inside a quoted attribute value ends the tag here, but not in a
 * browser.** HTML says `<` inside a quoted value is literal text; this filter
 * treats every `<` as a potential tag start. The divergence fails closed — the
 * opening fragment is dropped — but the text after it is then re-read as
 * markup, so an element can appear in the output that a browser would never
 * have built from the same input:
 *
 * ```
 *   in : <p a="<img src=x onerror=alert(1)>">
 *   out: <img src="x">">
 * ```
 *
 * The `<img>` is fully sanitized (the handler is gone), so this is a fidelity
 * loss and not a hole — but it is surprising enough to be worth stating.
 *
 * **3. One resource-fetching construct discards a whole `<style>` block.** See
 * `stripDangerousCss`: `url(`, `@import`, `image-set(`, `src(` or
 * `expression(` anywhere in a block — including inside a comment, since that
 * pass is not comment-aware — blanks the entire block rather than the offending
 * declaration.
 *
 * **4. A `<` inside a `<style>` tag's attributes spills the CSS as text.** See
 * the note on step 2.
 *
 * Every one of these is pinned by a test in `__tests__/unit/sanitize-html.test.ts`
 * (`describe("known content loss")`), so none of them can change silently.
 */

/**
 * 500 KB. Input above this is refused outright — the function returns "" and
 * logs, rather than attempting to sanitize.
 *
 * This is load-bearing for cost, not only for correctness: the branch bounds
 * how much work a single stored description can force on every storefront
 * render inside a CPU-metered Worker, which is what makes the measured
 * worst-case (~74 ms for the most expensive accepted input) an actual ceiling
 * instead of a sample. Raising it raises that ceiling proportionally.
 *
 * Deliberately NOT exported. The boundary tests hardcode 512000 so that
 * changing this number fails them; deriving the test's boundary from the
 * constant would let the cap move with the suite still green.
 */
const MAX_INPUT_LENGTH = 512_000;

/** A script/iframe element: opening tag, contents, and closing tag. */
const RAW_TEXT_ELEMENT_RE = /<(script|iframe)[^<>]*>[\s\S]*?(?:<\/\1(?=[\s/>])[^<>]*>|$)/gi;
/** A bare script/iframe tag, with no contents to go with it. */
const RAW_TEXT_TAG_RE = /<(script|iframe)[^<>]*\/?>/gi;

/**
 * Delete every match of `re` from `html` without welding the text in front of
 * a deleted span onto the text behind it.
 *
 * Cutting a span out of markup joins its two neighbours, and the join can
 * spell a tag that was in neither of them: an opening left dangling in front
 * of the cut gets completed by whatever follows it. A global replace never
 * re-examines its own output, so a pass cannot catch what it has itself just
 * built, and re-running it to a fixed point costs a fresh scan of the whole
 * string per level of nesting.
 *
 * So the cut is instead widened backwards, in the same single pass, to swallow
 * any unterminated markup sitting directly in front of the span — back to the
 * last ">", when a "<" occurs in between. Nothing that could be completed is
 * left in front of the cut, which makes this a property of this pass alone
 * rather than one inherited from a later pass. Widening only ever removes
 * characters that were already inside an unclosed tag, and a string with no
 * match at all is returned unchanged.
 */
function cutOut(html: string, re: RegExp): string {
  re.lastIndex = 0;
  let out = "";
  let cursor = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    matched = true;
    let start = m.index;
    // Both look-ups stay inside the gap in front of the span: the span itself
    // begins with a "<", and a span always ends with the ">" that the next
    // gap's backward look-up stops at. Successive gaps therefore do not
    // overlap and the added work over the whole string stays proportional to
    // its length.
    const lastGt = html.lastIndexOf(">", start - 1);
    const from = Math.max(cursor, lastGt + 1);
    const lt = html.indexOf("<", from);
    if (lt !== -1 && lt < start) start = lt;
    out += html.slice(cursor, start);
    cursor = m.index + m[0].length;
  }
  return matched ? out + html.slice(cursor) : html;
}

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
  // Both removals go through cutOut() so neither can weld a leftover opening
  // onto the text behind the span it deletes.
  result = cutOut(result, RAW_TEXT_ELEMENT_RE);
  result = cutOut(result, RAW_TEXT_TAG_RE);

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
  //
  // Deferred item, restated at its CURRENT size. This delimiter has never been
  // quote-aware: a ">" inside a <style> attribute value ends the open tag here
  // even though a browser would read it as part of the value. That is
  // architectural and shared with every tag in this file, and it is why
  // stripDangerousCss documents that it may be handed fragments of markup
  // rather than well-formed CSS.
  //
  // Narrowing the attribute run from [^>] to [^<>] changed the SHAPE of that
  // gap, and a deferral only covers what was actually recorded, so the new
  // shape is recorded here rather than left to be rediscovered. A "<" inside
  // a <style> attribute value now prevents this pass from matching at all —
  // the run stops at the "<" and the required ">" never arrives — so the block
  // is never recognised as CSS. Step 3 then drops the malformed open tag and
  // the CSS body survives as visible text, followed by a stray "</style>":
  //
  //   in : <style type="a<b">body{color:red}</style>
  //   out: body{color:red}</style>
  //
  // Consequence: cosmetic, not a hole. The body reaches the page as text
  // rather than as style, and every construct inside it has already passed
  // through step 3's tag filter, so nothing there is live — the trailing
  // "</style>" is an end tag with no matching start and closes nothing. It is
  // recorded rather than repaired because the alternative is restoring [^>],
  // which would give up the scan bound that step 1 and step 3 both rely on, in
  // exchange for prose fidelity in a case that is already inert. Pinned by a
  // test so it cannot drift further without being noticed.
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
      //
      // THIS IS WHERE CONTENT IS LOST. The dropped fragment runs from the "<"
      // to the next "<" or to the end of the input, so a "<" followed by a
      // letter anywhere in prose takes the rest of that run with it —
      // "for(i=0;i<n;i++){}" comes out as "for(i=0;i". That is deliberate and
      // measured (0 of 568 production descriptions affected); see the "KNOWN
      // CONTENT LOSS" section on sanitizeDescriptionHtml above for the full
      // statement, and `describe("known content loss")` in the tests for the
      // cases that pin it. Returning the fragment as text instead is what this
      // branch exists to prevent, so the loss cannot be traded away here.
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
