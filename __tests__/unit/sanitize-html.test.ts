import { describe, it, expect, vi } from "vitest";
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

  it("blocks vbscript: in href", () => {
    const input = '<a href="vbscript:MsgBox(1)">click</a>';
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toContain("vbscript:");
  });

  it("blocks mixed-case javascript: URIs", () => {
    const input = '<a href="JaVaScRiPt:alert(1)">click</a>';
    expect(sanitizeDescriptionHtml(input)).not.toContain("JaVaScRiPt:");
  });

  it("blocks whitespace-padded javascript: URIs", () => {
    const input = '<a href="  javascript:alert(1)">click</a>';
    expect(sanitizeDescriptionHtml(input)).not.toContain("javascript:");
  });

  it("strips self-closing script tags", () => {
    const input = '<p>safe</p><script src="evil.js"/><p>ok</p>';
    expect(sanitizeDescriptionHtml(input)).not.toContain("script");
  });

  it("escapes double quotes in attribute values to prevent injection", () => {
    const input = '<div class=foo"onclick=alert(1)>text</div>';
    const result = sanitizeDescriptionHtml(input);
    // The " in the unquoted value is escaped to &quot;, so the onclick
    // is safely contained inside the class attribute value, not a separate attribute
    expect(result).toContain('class="foo&quot;onclick=alert(1)"');
    expect(result).toContain("text");
  });

  it("preserves style blocks without scoping when no productId given", () => {
    const input = "<style>p { color: red; }</style><p>text</p>";
    const result = sanitizeDescriptionHtml(input);
    expect(result).toContain("p { color: red; }");
    expect(result).not.toContain(".desc-");
  });

  it("scopes comma-separated CSS selectors individually", () => {
    const input = "<style>h1, h2, .promo { color: blue; }</style>";
    const result = sanitizeDescriptionHtml(input, "p1");
    expect(result).toContain(".desc-p1 h1");
    expect(result).toContain(".desc-p1 h2");
    expect(result).toContain(".desc-p1 .promo");
  });

  // Scoping used to prefix EVERY run of text that reached a "{", on the
  // assumption that such a run is always a selector list. It is not: an
  // at-rule's prelude and a @keyframes step are both preludes too, and a
  // selector cannot precede either one. The browser drops the whole rule, so
  // the prefix did not merely add specificity — it deleted the rule.
  //
  // The oracles below are exact output strings rather than substring checks.
  // A `not.toContain(".desc-p1 @media")` assertion would go green the moment
  // the spacing changed, without the rule ever becoming valid again; only the
  // full string says what the browser will actually be handed.
  describe("scopes by at-rule context", () => {
    it("leaves an at-rule prelude unprefixed and still scopes inside it", () => {
      const input = "<style>@media (max-width: 768px) { .t { color: red; } }</style>";
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(
        "<style>@media (max-width: 768px) { .desc-p1 .t { color: red; } }</style>",
      );
    });

    it("scopes inside @supports as well", () => {
      const input = "<style>@supports (display: grid) { .g { display: grid; } }</style>";
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(
        "<style>@supports (display: grid) { .desc-p1 .g { display: grid; } }</style>",
      );
    });

    // The production case: all seven descriptions carrying a <style> block have
    // a @keyframes rule, and every one of them had its steps prefixed, which
    // kills the animation outright.
    it("leaves from/to keyframe steps untouched", () => {
      const input = "<style>@keyframes fade { from { opacity: 0; } to { opacity: 1; } }</style>";
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(input);
    });

    it("leaves percentage keyframe steps untouched, including lists", () => {
      const input = "<style>@keyframes k { 0%, 100% { opacity: 0; } 50.5% { opacity: 1; } }</style>";
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(input);
    });

    it.each([
      "<style>@font-face { font-weight: 700; }</style>",
      "<style>@page { margin: 1cm; }</style>",
    ])("leaves a declaration-only at-rule untouched: %s", (input) => {
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(input);
    });

    it("tracks context through nesting: keyframes inside a media query", () => {
      const input = "<style>@media screen { @keyframes k { from { opacity: 0; } } .b { color: red; } }</style>";
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(
        "<style>@media screen { @keyframes k { from { opacity: 0; } } .desc-p1 .b { color: red; } }</style>",
      );
    });

    it("does not prefix a selector that already carries the scope", () => {
      const input = "<style>.desc-p1 .a { color: red; }</style>";
      expect(sanitizeDescriptionHtml(input, "p1")).toBe(input);
    });

    // Stated plainly: this one PASSES against the pre-fix code and cannot fail
    // there, because that code prefixed every selector unconditionally. It is
    // not evidence of the defect. It guards the idempotence check introduced
    // alongside the fix: ".desc-p1x" is a DIFFERENT class that merely starts
    // with the same characters, so it still needs scoping, and a naive
    // startsWith() would leave it unscoped and let it leak out of the
    // description. It fails against that naive implementation, which is the
    // implementation it exists to rule out.
    it("still scopes a class that merely starts with the scope's characters", () => {
      expect(sanitizeDescriptionHtml("<style>.desc-p1x .a { color: red; }</style>", "p1")).toBe(
        "<style>.desc-p1 .desc-p1x .a { color: red; }</style>",
      );
    });

    it("scopes one member of a list and leaves the already-scoped one alone", () => {
      expect(sanitizeDescriptionHtml("<style>.desc-p1 .a, .b { color: red; }</style>", "p1")).toBe(
        "<style>.desc-p1 .a, .desc-p1 .b { color: red; }</style>",
      );
    });

    // A statement at-rule ends at its ";" and does not open a block, so the
    // selector behind it is a selector and must still be scoped.
    it("scopes the selector that follows a statement at-rule", () => {
      expect(sanitizeDescriptionHtml('<style>@charset "utf-8"; .a { color: red; }</style>', "p1")).toBe(
        '<style>@charset "utf-8"; .desc-p1 .a { color: red; }</style>',
      );
    });

    // A CSS comment is trivia, exactly like whitespace, and it can sit in front
    // of any prelude. Deciding what a prelude IS by looking at its first
    // NON-WHITESPACE character therefore reads a "/" where an "@" is meant, and
    // prefixes an at-rule that a browser then discards whole.
    //
    // This is not hypothetical. The generator that writes these descriptions
    // emits an "Animation" comment immediately before its @keyframes rule, and
    // six of the seven products carrying a <style> block have one there. They
    // were the six a repair pass could not fix.
    describe("comments in front of a prelude", () => {
      // Both fixtures below pivot on a fragment taken verbatim from a stored
      // description, de-scoped. The two differ ONLY by the comment, which is
      // what made oneplus-watch-lite the single product that repaired cleanly.
      const SAMSUNG = "}/* Animation d'entrée */\r\n        @keyframes fadeInUp {from {";
      const ONEPLUS = "}@keyframes fadeInUp {from {";

      function description(pivot: string): string {
        return `<style>.hero {color: #183c78;${pivot}opacity: 0;}to {opacity: 1;}}</style>`;
      }

      it("leaves @keyframes unprefixed when a comment precedes it (samsung-galaxy-buds4-pro)", () => {
        expect(sanitizeDescriptionHtml(description(SAMSUNG), "p1")).toBe(
          `<style>.desc-p1 .hero {color: #183c78;${SAMSUNG}opacity: 0;}to {opacity: 1;}}</style>`,
        );
      });

      // The CONTROL, and green before this fix on purpose: this is the one
      // product of the seven that a repair pass already handled, and it is the
      // one without a comment at that point. It is here so the pair above
      // isolates the comment as the single difference.
      it("still leaves @keyframes unprefixed with no comment (oneplus-watch-lite)", () => {
        expect(sanitizeDescriptionHtml(description(ONEPLUS), "p1")).toBe(
          `<style>.desc-p1 .hero {color: #183c78;${ONEPLUS}opacity: 0;}to {opacity: 1;}}</style>`,
        );
      });

      // A commented-out @media was doubly damaged: the at-rule was prefixed AND
      // the selectors inside it went unscoped, because the mangled prelude was
      // recorded as a block that holds no selectors.
      it("keeps a commented @media alive and still scopes inside it", () => {
        expect(
          sanitizeDescriptionHtml("<style>/* Responsive */@media (max-width:768px){.t{color:red}}</style>", "p1"),
        ).toBe("<style>/* Responsive */@media (max-width:768px){.desc-p1 .t {color:red}}</style>");
      });

      it("places the prefix after a comment in front of an ordinary selector", () => {
        expect(sanitizeDescriptionHtml("<style>/* c */.t{color:red}</style>", "p1")).toBe(
          "<style>/* c */.desc-p1 .t {color:red}</style>",
        );
      });

      it("stays idempotent when a comment precedes an already-scoped selector", () => {
        expect(sanitizeDescriptionHtml("<style>/* c */.desc-p1 .t{color:red}</style>", "p1")).toBe(
          "<style>/* c */.desc-p1 .t {color:red}</style>",
        );
      });

      it("handles a run of consecutive comments before an at-rule", () => {
        expect(sanitizeDescriptionHtml("<style>/* a *//* b */@media x{.t{color:red}}</style>", "p1")).toBe(
          "<style>/* a *//* b */@media x{.desc-p1 .t {color:red}}</style>",
        );
      });

      it("handles an empty comment before an at-rule", () => {
        expect(sanitizeDescriptionHtml("<style>/**/@keyframes k{from{opacity:0}}</style>", "p1")).toBe(
          "<style>/**/@keyframes k{from{opacity:0}}</style>",
        );
      });

      it("handles a comment before an at-rule nested inside @media", () => {
        expect(sanitizeDescriptionHtml("<style>@media x{/* c */@keyframes k{from{opacity:0}}}</style>", "p1")).toBe(
          "<style>@media x{/* c */@keyframes k{from{opacity:0}}}</style>",
        );
      });

      // Green before this fix too: the at-rule test already fired on the "@"
      // at the head of this prelude, so trivia AFTER the name never mattered.
      // Kept because it pins that the new trivia handling did not break it.
      it("leaves a comment between an at-rule's name and its block alone", () => {
        expect(sanitizeDescriptionHtml("<style>@media screen /* c */ {.t{color:red}}</style>", "p1")).toBe(
          "<style>@media screen /* c */ {.desc-p1 .t {color:red}}</style>",
        );
      });

      // Also green before: inside @keyframes every prelude is emitted
      // verbatim regardless of what it starts with, so a comment there was
      // never at risk. Pinned so that stays true.
      it("leaves a comment before a keyframe step alone", () => {
        expect(sanitizeDescriptionHtml("<style>@keyframes k{/* c */from{opacity:0}}</style>", "p1")).toBe(
          "<style>@keyframes k{/* c */from{opacity:0}}</style>",
        );
      });

      it("scopes a list member that carries a leading comment", () => {
        expect(sanitizeDescriptionHtml("<style>.a, /* c */ .b{color:red}</style>", "p1")).toBe(
          "<style>.desc-p1 .a, /* c */ .desc-p1 .b {color:red}</style>",
        );
      });

      it("scopes the selector behind a statement at-rule and a comment", () => {
        expect(sanitizeDescriptionHtml('<style>@charset "u"; /* c */ .a{color:red}</style>', "p1")).toBe(
          '<style>@charset "u"; /* c */ .desc-p1 .a {color:red}</style>',
        );
      });

      // A ";" and an "@" inside a comment are not a statement at-rule. Reading
      // them as one made the text behind the ";" look like an at-rule prelude,
      // and the selector escaped scoping entirely — it reached the page
      // unqualified and could restyle anything.
      it("does not read a semicolon and an at-sign inside a comment as a statement at-rule", () => {
        expect(sanitizeDescriptionHtml("<style>/* a; @b */ .c{color:red}</style>", "p1")).toBe(
          "<style>/* a; @b */ .desc-p1 .c {color:red}</style>",
        );
      });

      // A brace inside a comment is not a block boundary. Treating it as one
      // closed a block that was never open and put the prefix inside the
      // comment, where it styles nothing.
      it("does not treat a brace inside a comment as a block boundary", () => {
        expect(sanitizeDescriptionHtml("<style>/* } */ .a{color:red}</style>", "p1")).toBe(
          "<style>/* } */ .desc-p1 .a {color:red}</style>",
        );
      });

      // An unterminated comment runs to the end of the stylesheet, so a browser
      // sees no rule at all after it. Prefixing text inside it only wrote the
      // scope class into a comment body.
      it("leaves everything after an unterminated comment alone", () => {
        expect(sanitizeDescriptionHtml("<style>/* c .a{color:red}</style>", "p1")).toBe(
          "<style>/* c .a{color:red}</style>",
        );
      });
    });

    // Not every comma separates selectors. One inside a functional
    // pseudo-class argument, inside an attribute selector's brackets, or
    // inside a quoted value belongs to a single selector, and cutting there
    // splices the scope prefix into the middle of a token.
    //
    // Two failure modes, and the second is the dangerous one:
    //   * `:is(h1, h2)` becomes invalid, and an invalid selector drops the
    //     whole rule — loud, at least.
    //   * `a[title="x,y"]` stays syntactically VALID and simply matches
    //     something other than what the author wrote. Nothing errors, nothing
    //     is logged, and a parser-based check calls it clean. Only an exact
    //     output comparison catches it, which is why every oracle here is one.
    //
    // No production description uses any of this today. They are generated by
    // an AI writer, and the defect this whole task repairs arose exactly that
    // way — generated CSS meeting an assumption the scoper made about its
    // shape. The day the generator emits `:not(...)`, rules would start
    // disappearing with nothing in any log to say so.
    describe("commas that do not separate selectors", () => {
      it.each([
        [":is(h1, h2){c:r}", ".desc-p1 :is(h1, h2) {c:r}"],
        [":where(.a, .b){c:r}", ".desc-p1 :where(.a, .b) {c:r}"],
        [".t:not(.a, .b){c:r}", ".desc-p1 .t:not(.a, .b) {c:r}"],
        [".t:has(> a, > b){c:r}", ".desc-p1 .t:has(> a, > b) {c:r}"],
      ])("keeps a functional pseudo-class intact: %s", (css, expected) => {
        expect(sanitizeDescriptionHtml(`<style>${css}</style>`, "p1")).toBe(`<style>${expected}</style>`);
      });

      it("keeps nested functional pseudo-classes intact", () => {
        expect(sanitizeDescriptionHtml("<style>:is(:not(a, b), c){c:r}</style>", "p1")).toBe(
          "<style>.desc-p1 :is(:not(a, b), c) {c:r}</style>",
        );
      });

      // The silent one. The output below is valid CSS either way — the broken
      // form just matches a different title, for ever, with no symptom.
      //
      // The `x)y` row is green before this fix and cannot fail there: it has no
      // comma, so nothing split. It guards the paren tracking added here, which
      // must not let a stray ")" inside a string unbalance the depth counter.
      it.each([
        ['a[title="x,y"]{c:r}', '.desc-p1 a[title="x,y"] {c:r}'],
        ["a[title='x,y']{c:r}", ".desc-p1 a[title='x,y'] {c:r}"],
        ['a[title="x)y"]{c:r}', '.desc-p1 a[title="x)y"] {c:r}'],
        ['a[title="x\\",y"]{c:r}', '.desc-p1 a[title="x\\",y"] {c:r}'],
        ['a[title="x,y{z"]{c:r}', '.desc-p1 a[title="x,y{z"] {c:r}'],
      ])("keeps a quoted attribute value intact: %s", (css, expected) => {
        expect(sanitizeDescriptionHtml(`<style>${css}</style>`, "p1")).toBe(`<style>${expected}</style>`);
      });

      // The control, green before and after: the point of the whole exercise is
      // that ordinary lists must keep splitting. A splitter that stopped
      // splitting would pass every other test in this block.
      it("still splits a plain selector list", () => {
        expect(sanitizeDescriptionHtml("<style>h1, h2{c:r}</style>", "p1")).toBe(
          "<style>.desc-p1 h1, .desc-p1 h2 {c:r}</style>",
        );
      });

      it("splits around a functional pseudo-class without splitting inside it", () => {
        expect(sanitizeDescriptionHtml("<style>:is(h1, h2), .b{c:r}</style>", "p1")).toBe(
          "<style>.desc-p1 :is(h1, h2), .desc-p1 .b {c:r}</style>",
        );
      });

      // A ";" inside a quoted value is not a statement at-rule's terminator
      // either. The "@" requirement alone did not exclude this: a real
      // statement at-rule earlier in the prelude sets that flag, and the split
      // then landed on the ";" inside the attribute value.
      it.each(['@charset "u"; a[href*=";"]{c:r}', "@layer base; a[href*=\";\"]{c:r}"])(
        "splits a statement at-rule at its own semicolon, not the selector's: %s",
        (css) => {
          const at = css.slice(0, css.indexOf(";") + 1);
          expect(sanitizeDescriptionHtml(`<style>${css}</style>`, "p1")).toBe(
            `<style>${at} .desc-p1 a[href*=";"] {c:r}</style>`,
          );
        },
      );

      // Green before this fix, and pinned so the new statement-end scan cannot
      // regress it: here the prelude carries no at-keyword at all, so the old
      // "@" requirement already excluded it. It is the narrow case the broad
      // one above was mistaken for.
      it("leaves a semicolon-bearing selector alone inside @media", () => {
        expect(sanitizeDescriptionHtml('<style>@media (min-width:1px){ a[href*=";"]{c:r} }</style>', "p1")).toBe(
          '<style>@media (min-width:1px){ .desc-p1 a[href*=";"] {c:r} }</style>',
        );
      });

      // A string can hold the very tokens the block sweep looks for. Both of
      // these were real: the first started a comment that ran to end of input,
      // so the selector was never scoped AT ALL; the second closed the
      // animation early, and the step behind it was prefixed as a selector.
      it("does not start a comment inside a quoted value", () => {
        expect(sanitizeDescriptionHtml('<style>a[title="/*"]{c:r}</style>', "p1")).toBe(
          '<style>.desc-p1 a[title="/*"] {c:r}</style>',
        );
      });

      it("does not close a block on a brace inside a quoted value", () => {
        expect(sanitizeDescriptionHtml('<style>@keyframes k{.a{content:"}"}from{o:0}}</style>', "p1")).toBe(
          '<style>@keyframes k{.a{content:"}"}from{o:0}}</style>',
        );
      });

      // Green before too, but by luck rather than by design: a "}" only ever
      // pops the stack and emits nothing, so a stray one at depth zero was
      // harmless. It stops being luck inside @keyframes — the case above.
      it("keeps scoping the rule behind a brace held in a quoted value", () => {
        expect(sanitizeDescriptionHtml('<style>.a{content:"}"}.b{x:y}</style>', "p1")).toBe(
          '<style>.desc-p1 .a {content:"}"}.desc-p1 .b {x:y}</style>',
        );
      });

      // An unreadable construct suppresses splitting rather than guessing:
      // nothing is inserted into something this pass cannot parse.
      it.each(["a[unclosed,b{c:r}", 'a[title="unclosed,b{c:r}'])(
        "does not split after an unterminated bracket or quote: %s",
        (css) => {
          const result = sanitizeDescriptionHtml(`<style>${css}</style>`, "p1");
          expect(result).toBe(`<style>.desc-p1 ${css.replace("{c:r}", " {c:r}")}</style>`);
          // the giveaway that no split happened: exactly one prefix
          expect(result.match(/\.desc-p1/g)).toHaveLength(1);
        },
      );
    });

    // …and a ";" that belongs to the selector rather than to a statement
    // at-rule must not be treated as one, or the selector is cut in half.
    //
    // Third of the three tests here that are green against the pre-fix code:
    // it guards the statement-at-rule split introduced above, not the defect.
    // Verified against the ungated form of that split, which produces
    // '<style>a[href*=";.desc-p1 "] { color: red; }</style>' — a selector with
    // the scope prefix buried inside its attribute value.
    it("does not split a selector on a semicolon inside an attribute value", () => {
      expect(sanitizeDescriptionHtml('<style>a[href*=";"] { color: red; }</style>', "p1")).toBe(
        '<style>.desc-p1 a[href*=";"] { color: red; }</style>',
      );
    });
  });

  // Security regression (GHSA-92r4): tags using "/" as the attribute separator
  // must NOT bypass sanitization. Previously the tag regex only matched
  // whitespace-separated attributes, so these passed through verbatim.
  it("neutralizes onerror when '/' is used as the attribute separator", () => {
    const result = sanitizeDescriptionHtml("<img/src=x/onerror=alert(document.domain)>");
    // The tag is now parsed: the unquoted src value folds the rest of the
    // payload inside the quoted src attribute, so onerror is inert (not a
    // standalone attribute) and cannot fire. Crucially it does NOT pass through
    // verbatim as it did before the fix.
    expect(result).toBe('<img src="x/onerror=alert(document.domain)">');
    expect(result).not.toBe("<img/src=x/onerror=alert(document.domain)>");
  });

  it("strips a disallowed tag written with a '/' separator", () => {
    const result = sanitizeDescriptionHtml("<svg/onload=alert(1)>content");
    expect(result).not.toContain("<svg");
    expect(result).not.toMatch(/\bonload\s*=/i);
    expect(result).toContain("content");
  });

  it("neutralizes an onmouseover handler after a '/' separator on an allowed tag", () => {
    const result = sanitizeDescriptionHtml("<p/onmouseover=alert(1)>hi</p>");
    expect(result).not.toMatch(/\bonmouseover\s*=/i);
    expect(result).toContain("hi");
  });

  // Security regression (GHSA-m888): inline style must not carry url()/@import/
  // expression(), which leak outbound requests or execute legacy CSS.
  it("strips url() from an inline style attribute", () => {
    const result = sanitizeDescriptionHtml(
      '<div style="background:url(https://evil.example/leak)">x</div>'
    );
    expect(result).not.toContain("url(");
    expect(result).not.toContain("evil.example");
    expect(result).toContain("<div");
  });

  it("strips @import and expression() from an inline style attribute", () => {
    const result = sanitizeDescriptionHtml(
      '<div style="width:expression(alert(1));@import \'evil.css\'">x</div>'
    );
    expect(result).not.toContain("expression(");
    expect(result).not.toContain("@import");
  });

  it("keeps benign inline style declarations intact", () => {
    const result = sanitizeDescriptionHtml('<div style="color:red;font-weight:bold">x</div>');
    expect(result).toContain("color:red");
    expect(result).toContain("font-weight:bold");
  });

  it("strips an UNTERMINATED url( from an inline style attribute", () => {
    const result = sanitizeDescriptionHtml(
      '<div style="background:url(https://evil.example/leak">x</div>'
    );
    expect(result).not.toContain("url(");
    expect(result).not.toContain("evil.example");
  });

  it("strips an UNTERMINATED url( from a <style> block", () => {
    const result = sanitizeDescriptionHtml(
      "<style>p { background: url(https://evil.example/leak }</style><p>x</p>"
    );
    expect(result).not.toContain("url(");
    expect(result).not.toContain("evil.example");
  });

  describe("style tag handling", () => {
    it("strips event handlers from a style tag closed with trailing whitespace", () => {
      const input = '<style onload="alert(1)">body{}</style >';
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
    });

    it("strips event handlers from an unterminated style tag", () => {
      const input = '<style onload="alert(1)">body{}';
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
    });

    it("strips unquoted event handlers on a style tag", () => {
      const input = "<style onload=alert(1)>body{}</style >";
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
    });

    it("strips event handlers regardless of tag case", () => {
      const input = '<STYLE ONLOAD="alert(1)">x</STYLE >';
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/onload/i);
    });

    it("still filters @import when the closing tag has trailing whitespace", () => {
      const input = '<style>@import url("//evil.example/x.css");</style >';
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/@import/i);
    });
  });

  // Hardening: the generic tag pass only recognized [a-zA-Z][a-zA-Z0-9]* as a
  // tag name, but a browser's tokenizer appends ANY character other than
  // whitespace, "/" or ">" to a tag name once it starts with an ASCII letter.
  // Tags containing "-", "_", ":" or "." never matched that narrower class and
  // so never reached the allowlist check at all — they passed through with
  // their attributes completely untouched.
  describe("non-alphanumeric tag names", () => {
    it("strips a hyphenated tag and its event handler", () => {
      const input = '<my-tag onclick="alert(1)">x</my-tag>';
      const result = sanitizeDescriptionHtml(input);
      expect(result).not.toContain("<my-tag");
      expect(result).not.toMatch(/onclick/i);
      expect(result).toContain("x");
    });

    it("strips a tag name containing an underscore and its event handler", () => {
      const input = '<a_b onclick="alert(1)">x</a_b>';
      const result = sanitizeDescriptionHtml(input);
      expect(result).not.toContain("<a_b");
      expect(result).not.toMatch(/onclick/i);
    });

    it("strips a tag name containing a colon and its event handler", () => {
      const input = '<a:b onclick="alert(1)">x</a:b>';
      const result = sanitizeDescriptionHtml(input);
      expect(result).not.toContain("<a:b");
      expect(result).not.toMatch(/onclick/i);
    });

    it("strips a tag name containing a dot and its event handler", () => {
      const input = '<a.b onclick="alert(1)">x</a.b>';
      const result = sanitizeDescriptionHtml(input);
      expect(result).not.toContain("<a.b");
      expect(result).not.toMatch(/onclick/i);
    });

    it("still allows a plain allowed tag through unchanged (control)", () => {
      const input = '<h1 onclick="alert(1)">ok</h1>';
      const result = sanitizeDescriptionHtml(input);
      expect(result).toBe("<h1>ok</h1>");
    });
  });

  // Hardening: a malformed <style> block whose @import is stripped mid-string
  // can splice surviving fragments into a literal "</style>" that did not
  // exist in the original input, closing the block early. Whatever follows is
  // then parsed as ordinary markup by a real browser, not as inert CSS text —
  // so it must still be caught by the generic tag pass. Confirms the widened
  // tag-name class (above) closes this residual path.
  it("neutralizes a handler exposed by an @import splice inside a style block", () => {
    const input = "<style>a{}</st@import 1;yle><my-tag onclick=alert(1)";
    const result = sanitizeDescriptionHtml(input);
    expect(result).not.toMatch(/onclick/i);
    expect(result).not.toContain("<my-tag");
  });

  // A "<" that never gets a matching ">" is not a tag. It used to be left in
  // the output verbatim, which meant a real browser could still fold whatever
  // followed into a live element. It is dropped instead.
  // Deleting a span joins the text on either side of it, and the join can
  // spell an element that was in neither side — an opening left unterminated
  // in front of the deleted span gets finished off by what follows. The
  // raw-text removal must not leave one behind, on its own, without relying on
  // a later pass to clean up after it.
  //
  // These use ALLOWED tag names deliberately: a disallowed one would be
  // dropped later anyway, which would hide the result. An allowed one is kept,
  // so if the removal leaves an element the assertion sees it.
  describe("raw-text removal leaves no element behind", () => {
    const cases: [string, string, string][] = [
      ["through an element removal", "<p<script>x</script> class=welded>", "<p"],
      ["through an iframe removal", "<p<iframe>x</iframe> class=welded>", "<p"],
      ["when the element never closes", "<di<script src=a>v class=welded>", "<div"],
      ["with two unterminated openings", "<spa<spa<script>x</script>n>n class=welded>", "<span"],
      ["regardless of case", "<im<SCRIPT>x</SCRIPT>g src=y>", "<img"],
      ["when the closing tag has attributes", "<p<script>x</script foo> class=welded>", "<p"],
      ["with three unterminated openings", "<p<p<p<script>x</script>>> class=welded>", "<p"],
      ["across two consecutive removals", "<h<script>a</script><script>b</script>1 class=welded>", "<h1"],
    ];
    for (const [label, input, forbidden] of cases) {
      it(label, () => {
        expect(sanitizeDescriptionHtml(input)).not.toContain(forbidden);
      });
    }

    it("still removes the element and its content in the ordinary case", () => {
      expect(sanitizeDescriptionHtml('<p>Hello</p><script>alert("xss")</script><p>World</p>'))
        .toBe("<p>Hello</p><p>World</p>");
      expect(sanitizeDescriptionHtml('<iframe src="evil.com"></iframe><p>safe</p>'))
        .toBe("<p>safe</p>");
    });

    it("leaves no live handler behind for any of these shapes", () => {
      const shapes = [
        "<scr<script>x</script>ipt src=y onerror=z>",
        "<ifra<iframe>x</iframe>me src=y onload=z>",
        "<scr<script src=a>ipt src=y onerror=z>",
        "<scr<scr<script>x</script>ipt>ipt src=y onerror=z>",
        "<scr<style>a{}</style><script>x</script>ipt src=y onerror=z>",
        "<SCR<SCRIPT>x</SCRIPT>IPT SRC=y ONERROR=z>",
        "<scr<script>x</script foo>ipt src=y onerror=z>",
        "<<scr<script>x</script>ipt src=y onerror=z>",
        "<scr<script>a</script><script>b</script>ipt src=y onerror=z>",
        "<scr<scr<scr<script>x</script>ipt>ipt>ipt src=y onerror=z>",
      ];
      for (const shape of shapes) {
        const result = sanitizeDescriptionHtml(shape);
        // No element may carry the handler: the text may survive, but only as
        // text, so no "<" may precede it.
        expect(result).not.toMatch(/<[a-zA-Z][^<>]*on[a-z]+\s*=/i);
        expect(result.toLowerCase()).not.toContain("<script");
        expect(result.toLowerCase()).not.toContain("<iframe");
      }
    });
  });

  describe("incomplete tags", () => {
    it("drops a tag start that never closes, handler included", () => {
      const result = sanitizeDescriptionHtml("<p>ok</p><img src=x onerror=alert(1)");
      expect(result).toBe("<p>ok</p>");
    });

    it("drops a tag start interrupted by another '<'", () => {
      const result = sanitizeDescriptionHtml("<a<b onclick=alert(1)>x");
      expect(result).not.toMatch(/onclick/i);
      expect(result).not.toContain("<a");
      expect(result).not.toContain("<b");
    });

    // This assertion used to be `not.toMatch(/onerror/i)` alone, which no
    // mutation of the pass it sits in could break: widening the attribute run
    // back to [^>] still drops the handler, because the attribute allowlist
    // catches it a second time. Its neighbours were doing the work. The exact
    // output is the oracle that actually discriminates — and it also records a
    // surprise worth knowing, since the emitted <img> is an element a browser
    // would never have built from this input (HTML says "<" inside a quoted
    // value is text). Sanitized, therefore inert; but not a faithful rendering.
    it("ends the tag at a '<' inside an attribute value, and sanitizes what follows", () => {
      const result = sanitizeDescriptionHtml('<p a="<img src=x onerror=alert(1)>">');

      expect(result).toBe('<img src="x">">');
      expect(result).not.toMatch(/onerror/i);
    });

    // Removing a disallowed tag used to push the "<" in front of it against
    // the text behind it, reassembling a live element that was never in the
    // input: "<<x>img src=y onerror=…>" came back out as a working <img>.
    it("does not reassemble a tag out of a leading '<' and trailing text", () => {
      // The handler text may survive — inert, as text — but it must not be
      // carried by an element, so no "<" may precede it.
      const result = sanitizeDescriptionHtml("<<x>img src=y onerror=alert(1)>");
      expect(result).toBe("&lt;img src=y onerror=alert(1)>");
      expect(result).not.toContain("<");
    });

    it("leaves a lone '<' in prose alone", () => {
      const input = "<p>5 < 10 et 20 > 3</p>";
      expect(sanitizeDescriptionHtml(input)).toBe(input);
    });
  });

  // The filter is not lossless, and these losses are deliberate — the price of
  // failing closed where it cannot model a browser with confidence. They are
  // pinned here so they stay a known trade-off rather than becoming a surprise
  // the day someone writes a technical spec containing "i<n". If one of these
  // fails, the question is whether the SOURCE content should change, never
  // whether the filter should be softened: each loss corresponds to a branch
  // that exists to keep something out. See the "KNOWN CONTENT LOSS" section on
  // sanitizeDescriptionHtml.
  //
  // Exposure was measured before accepting them: 0 of 568 non-empty production
  // descriptions are affected, and the seven products carrying generated
  // <style> blocks are byte-identical before and after.
  describe("known content loss", () => {
    it("discards a code sample from '<' to the next '<'", () => {
      // "i<n" opens what the filter must read as a tag; ";i++){}" goes with it.
      // A 2,686-byte description built this way lost 2,623 bytes.
      const result = sanitizeDescriptionHtml("<pre><code>for(i=0;i<n;i++){}</code></pre>");

      expect(result).toBe("<pre><code>for(i=0;i</code></pre>");
    });

    it("discards to the end of the input when no further '<' follows", () => {
      const result = sanitizeDescriptionHtml("<p>a<n more text here");

      expect(result).toBe("<p>a");
    });

    it("loses only the letter case, never a '<' used as an operator", () => {
      // The distinction that keeps ordinary prose intact: a tag can only start
      // with an ASCII letter, so "5 < 10" and "a <= b" are never touched.
      expect(sanitizeDescriptionHtml("<p>5 < 10</p>")).toBe("<p>5 < 10</p>");
      expect(sanitizeDescriptionHtml("<p>a <= b</p>")).toBe("<p>a <= b</p>");
    });

    it("spills a style block as text when its attributes contain a '<'", () => {
      // Deferred item, recorded at its current size rather than its original
      // one: the <style> delimiter's attribute run stops at "<", so this block
      // is never recognised as CSS. The body reaches the page as inert text,
      // followed by an end tag that closes nothing. Cosmetic, not a hole —
      // everything in the body has still been through the tag filter.
      const result = sanitizeDescriptionHtml('<style type="a<b">body{color:red}</style>');

      expect(result).toBe("body{color:red}</style>");
      expect(result).not.toContain("<style");
    });

    it("does not let a spilled style block disturb the markup after it", () => {
      const result = sanitizeDescriptionHtml(
        '<style type="a<b">body{color:red}</style><p>after</p>'
      );

      expect(result).toBe("body{color:red}</style><p>after</p>");
    });
  });

  // Guard against a return of the pathological scan cost: these shapes used to
  // take tens of seconds each, and the pass runs on every storefront render of
  // a product description inside a CPU-metered Worker. The budget leaves ~24x
  // headroom over the measured cost so ordinary CI noise cannot trip it, while
  // a return to seconds fails immediately.
  // The attribute scanner treats the "= value" part as optional so it does not
  // re-walk a name run; these lock in that the set of surviving attributes is
  // unchanged by that.
  describe("attribute scanning", () => {
    it("ignores a valueless attribute but keeps its neighbours", () => {
      expect(sanitizeDescriptionHtml('<div hidden class="a">x</div>')).toBe('<div class="a">x</div>');
    });

    it("still drops a handler that has no value", () => {
      const result = sanitizeDescriptionHtml('<div onclick class="a">x</div>');
      expect(result).toBe('<div class="a">x</div>');
    });

    it("keeps an attribute whose '=' is padded with spaces", () => {
      expect(sanitizeDescriptionHtml('<div class = "a">x</div>')).toBe('<div class="a">x</div>');
    });

    it("still drops a handler buried after unparsable text", () => {
      const result = sanitizeDescriptionHtml('<div abc onclick=alert(1) class=b>x</div>');
      expect(result).not.toMatch(/onclick/i);
      expect(result).toBe('<div class="b">x</div>');
    });
  });

  it("leaves brace-free CSS unscoped and intact", () => {
    // A run of style-block text that never reaches a "{" is not a selector.
    const result = sanitizeDescriptionHtml("<style>this is not css</style>", "prod-1");
    expect(result).toBe("<style>this is not css</style>");
  });

  it("sanitizes adversarial tag-soup in linear time", () => {
    // [input, productId]. The productId matters: selector scoping only runs
    // when one is supplied, so the <style> shapes below exercise nothing
    // without it.
    const shapes: [string, string | undefined][] = [
      // tag-boundary scan
      ["<a-".repeat(40000), undefined],
      ["<a<".repeat(40000), undefined],
      ["<a ".repeat(40000), undefined],
      ["<style".repeat(40000), undefined],
      ["<script>".repeat(40000), undefined],
      ["<a" + "x".repeat(400000), undefined],
      ["<p a<".repeat(80000), undefined],
      // attribute scan
      ["<p " + "a".repeat(400000) + ">", undefined],
      ["<p " + "a-".repeat(200000) + ">", undefined],
      ["<p " + "a=x ".repeat(100000) + ">", undefined],
      // <style> selector scoping
      ["<style>" + "a".repeat(400000), "prod-1"],
      ["<style>".repeat(70000), "prod-1"],
      ["<style>a{" + "b".repeat(400000), "prod-1"],
      ["<style>" + "a{}".repeat(130000), "prod-1"],
      // …and the constructs the context-tracking sweep added. Each one drives a
      // different part of it: unbounded nesting depth, an at-rule prelude that
      // never gets a block, a keyframe step list, a selector list with no
      // members, and a prelude carrying a statement at-rule's ";".
      ["<style>" + "{".repeat(400000), "prod-1"],
      ["<style>" + "}".repeat(400000), "prod-1"],
      ["<style>" + "@media x{".repeat(50000), "prod-1"],
      ["<style>@keyframes k{" + "0%,".repeat(130000), "prod-1"],
      ["<style>" + ",".repeat(400000) + "{}", "prod-1"],
      ["<style>" + ".desc-prod-1 a,".repeat(28000) + "{}", "prod-1"],
      ["<style>" + ";".repeat(400000) + "a{}", "prod-1"],
      ["<style>" + "@media x{a{b}}".repeat(30000), "prod-1"],
      // …and the comment handling. Skipping a comment is where a scanner most
      // easily starts re-reading what it has already read, so each of these is
      // dense in one thing the trivia skip has to step over: many tiny
      // comments, comments in front of preludes, a comment holding the very
      // characters the statement-at-rule split looks for, a comment holding a
      // brace, and an unterminated "/*" — which a browser treats as running to
      // the end of the sheet, and which must therefore cost one jump, not a
      // scan per following position.
      ["<style>" + "/**/".repeat(100000), "prod-1"],
      ["<style>" + "/*c*/a{}".repeat(50000), "prod-1"],
      ["<style>" + "/*c*/@keyframes k{from{o:0}}".repeat(14000), "prod-1"],
      ["<style>" + "/* ; @ */a{}".repeat(33000), "prod-1"],
      ["<style>" + "/* } */".repeat(57000), "prod-1"],
      ["<style>" + ".a,/*c*/.b{x:y}".repeat(26000), "prod-1"],
      ["<style>a{b:c}/*" + "a".repeat(400000), "prod-1"],
      ["<style>/*" + "a".repeat(400000) + "*/.x{y:z}", "prod-1"],
      ["<style>" + "/*".repeat(200000), "prod-1"],
      ["<style>" + "*/".repeat(200000), "prod-1"],
      // …and the selector splitter, which now tracks strings, brackets and
      // parens instead of calling split(","). That is the classic place a
      // linear pass turns quadratic, so each shape is dense in one thing the
      // tracker maintains: quotes, quoted commas, nested functional
      // pseudo-classes, a brace held inside a string, unbounded nesting depth,
      // a plain comma run, and — the ones that used to be most expensive — an
      // unterminated "[" or quote followed by 240,000 commas, which must now
      // suppress splitting rather than emit a prefix per comma.
      ["<style>" + '""'.repeat(200000), "prod-1"],
      ["<style>" + "''".repeat(200000), "prod-1"],
      ["<style>" + 'a[b="c,d"]{}'.repeat(34000), "prod-1"],
      ["<style>" + ':is(a,b),c[d="e,f"]{g:h}'.repeat(18000), "prod-1"],
      ["<style>" + 'a{content:"}"}'.repeat(29000), "prod-1"],
      ["<style>" + ":is(".repeat(100000) + "a" + ")".repeat(100000) + "{x:y}", "prod-1"],
      ["<style>" + "[".repeat(250000) + "a{x:y}", "prod-1"],
      ["<style>" + ".a,".repeat(160000) + "{x:y}", "prod-1"],
      ["<style>a[" + ",b".repeat(240000) + "{x:y}", "prod-1"],
      ['<style>a["' + ",b".repeat(240000) + "{x:y}", "prod-1"],
      ['<style>a[t="' + "b".repeat(400000) + '"]{x:y}', "prod-1"],
    ];
    const started = Date.now();
    for (const [shape, productId] of shapes) sanitizeDescriptionHtml(shape, productId);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(3000);
  }, 30000);

  // Hardening: a browser resolves HTML character references and CSS escapes
  // BEFORE it decides what a URL's scheme is or what a declaration does. A
  // filter that compares literal tokens against the raw value is therefore
  // reading a different document than the parser that ultimately runs. Values
  // are now resolved the same way before the accept/reject decision.
  //
  // The oracle here is "the attribute did not survive", not "the output does
  // not contain the literal string javascript" — an encoded payload does not
  // contain that literal string in the first place, so a substring assertion
  // would pass against the unfixed code and prove nothing.
  // The input cap is what makes the branch's cost argument a ceiling rather
  // than a sample: "the worst accepted input costs ~39 ms" only means anything
  // if nothing larger is ever accepted. It was previously unpinned — raising
  // it tenfold, or deleting the guard outright, left every test green.
  //
  // The boundary is hardcoded on purpose. MAX_INPUT_LENGTH is not exported,
  // and deriving these numbers from it would let the cap move with the suite
  // still passing — the same self-reference that made the guard invisible.
  describe("input size cap", () => {
    const MAX = 512_000;

    /** A description of exactly `length` bytes that survives sanitization whole. */
    function paragraphOfLength(length: number): string {
      return `<p>${"a".repeat(length - "<p></p>".length)}</p>`;
    }

    it("accepts an input just under the cap", () => {
      const input = paragraphOfLength(MAX - 1);
      expect(input).toHaveLength(MAX - 1);

      expect(sanitizeDescriptionHtml(input)).toBe(input);
    });

    it("accepts an input of exactly the cap", () => {
      const input = paragraphOfLength(MAX);
      expect(input).toHaveLength(MAX);

      expect(sanitizeDescriptionHtml(input)).toBe(input);
    });

    it("fails closed one byte over the cap", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const input = paragraphOfLength(MAX + 1);
      expect(input).toHaveLength(MAX + 1);

      expect(sanitizeDescriptionHtml(input)).toBe("");
      // Asserting which branch fired, not just that the result is empty: the
      // catch-all also returns "", so an empty string alone would not prove
      // the cap is what refused this input.
      expect(error).toHaveBeenCalledOnce();
      expect(String(error.mock.calls[0][0])).toContain("exceeds max length");

      error.mockRestore();
    });

    it("reports the offending length and product so an operator can act", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});

      sanitizeDescriptionHtml(paragraphOfLength(MAX + 1), "prod-42");

      expect(error.mock.calls[0][1]).toMatchObject({
        length: MAX + 1,
        productId: "prod-42",
      });

      error.mockRestore();
    });
  });

  describe("URI scheme filtering resists encoding", () => {
    it.each([
      '<a href="&#106;avascript:alert(1)">x</a>',
      '<a href="&#x6a;avascript:alert(1)">x</a>',
      '<a href="java&#9;script:alert(1)">x</a>',
      '<a href="java\tscript:alert(1)">x</a>',
      '<img src="&#106;avascript:alert(1)">',
      '<a href="&#0000106;avascript:alert(1)">x</a>',
      '<a href="&#x0006a;avascript:alert(1)">x</a>',
      '<a href="&#106avascript:alert(1)">x</a>',
      '<a href="jav&NewLine;ascript&colon;alert(1)">x</a>',
      '<a href="java&Tab;script&#x3a;alert(1)">x</a>',
      '<a href="javascript:alert(1)">x</a>',
      '<a href="data&colon;text/html,payload">x</a>',
      '<a href="vbscript&#58;msgbox(1)">x</a>',
      '<img src="&#100;ata:text/html,payload">',
    ])("drops an href or src whose scheme only appears once decoded: %j", (input) => {
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/\b(?:href|src)\s*=/i);
    });

    it.each([
      '<a href="//evil.example/x">x</a>',
      '<a href="\\\\evil.example/x">x</a>',
      '<a href="/\\evil.example/x">x</a>',
      '<a href="\\/evil.example/x">x</a>',
    ])("drops a scheme-relative reference that points off-site: %j", (input) => {
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/\bhref\s*=/i);
    });

    it.each([
      "ftp://evil.example/x",
      "file:///etc/passwd",
      "blob:https://evil.example/x",
      "view-source:https://netereka.ci",
    ])("drops an href carrying an unlisted scheme: %s", (uri) => {
      expect(sanitizeDescriptionHtml(`<a href="${uri}">x</a>`)).not.toMatch(/\bhref\s*=/i);
    });

    it("keeps legitimate links intact", () => {
      const input = '<a href="https://netereka.ci/p/abc">produit</a>';
      expect(sanitizeDescriptionHtml(input)).toContain('href="https://netereka.ci/p/abc"');
    });

    it("keeps relative links intact", () => {
      expect(sanitizeDescriptionHtml('<a href="/c/telephones">cat</a>')).toContain('href="/c/telephones"');
    });

    it("keeps fragment, query, mailto and tel references intact", () => {
      expect(sanitizeDescriptionHtml('<a href="#specs">specs</a>')).toContain('href="#specs"');
      expect(sanitizeDescriptionHtml('<a href="?page=2">suite</a>')).toContain('href="?page=2"');
      expect(sanitizeDescriptionHtml('<a href="mailto:contact@netereka.ci">mail</a>')).toContain(
        'href="mailto:contact@netereka.ci"',
      );
      expect(sanitizeDescriptionHtml('<a href="tel:+2250700000000">tel</a>')).toContain(
        'href="tel:+2250700000000"',
      );
    });

    it("keeps scheme-less relative references intact", () => {
      // Produced by the rich-text editor for uploaded images, and by hand-written
      // legacy descriptions. A reference with no scheme cannot introduce one.
      expect(sanitizeDescriptionHtml('<img src="/images/description-images/abc123.jpg" alt="p">')).toContain(
        'src="/images/description-images/abc123.jpg"',
      );
      expect(sanitizeDescriptionHtml('<img src="photos/telephone.jpg" alt="p">')).toContain(
        'src="photos/telephone.jpg"',
      );
    });

    it("emits the original value, not the decoded one", () => {
      // Normalisation decides; it must never replace what is emitted, or a
      // legitimate reference carrying an entity would render differently.
      const input = '<a href="https://netereka.ci/s?a=1&amp;b=2">q</a>';
      expect(sanitizeDescriptionHtml(input)).toContain('href="https://netereka.ci/s?a=1&amp;b=2"');
    });
  });

  describe("CSS filtering resists escaping", () => {
    it.each([
      "<style>body{background:u\\72 l(https://evil.example/x)}</style>",
      "<style>body{background:\\75\\72\\6c(https://evil.example/x)}</style>",
      '<style>body{background:image-set("https://evil.example/x" 1x)}</style>',
      '<style>body{background:-webkit-image-set("https://evil.example/x" 1x)}</style>',
      '<style>@\\69 mport "https://evil.example/x";</style>',
      '<style>@\\0069mport "https://evil.example/x";</style>',
      "<style>@font-face{src:url(https://evil.example/x)}</style>",
      '<div style="background:u\\72 l(https://evil.example/x)">a</div>',
      '<div style="background:URL(https://evil.example/x)">a</div>',
      '<div style="background:&#117;rl(https://evil.example/x)">a</div>',
      '<div style="background:u&#92;72 l(https://evil.example/x)">a</div>',
      '<div style="background:url&lpar;https://evil.example/x)">a</div>',
      '<div style="behavior:url(https://evil.example/x)">a</div>',
      '<div style="background:u&#x5c;72 l(https://evil.example/x)">a</div>',
    ])("neutralises a resource fetch that only appears once decoded: %j", (input) => {
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/evil\.example/);
    });

    // A module-level regex carrying the "g" flag keeps its lastIndex across
    // calls when used with .test(), so the second call on the same input can
    // silently disagree with the first — a filter that only holds every other
    // time, and one that unit tests running in isolation would not catch.
    it("reaches the same verdict on repeated calls with the same input", () => {
      const inputs = [
        "<style>body{background:u\\72 l(https://evil.example/x)}</style>",
        '<div style="background:url(https://evil.example/x)">a</div>',
        '<style>@import "https://evil.example/x";</style>',
        '<a href="&#106;avascript:alert(1)">x</a>',
      ];
      for (const input of inputs) {
        const first = sanitizeDescriptionHtml(input);
        for (let i = 0; i < 5; i++) {
          expect(sanitizeDescriptionHtml(input)).toBe(first);
        }
        expect(first).not.toMatch(/evil\.example/);
        expect(first).not.toMatch(/\bhref\s*=/i);
      }
    });

    it("does not emit a once-resolved escape a browser would resolve again", () => {
      // "\5c 75 rl(" is an escaped backslash followed by literal text: a browser
      // resolves it once and sees no url(). Emitting the resolved form instead
      // of the original would hand the browser "\75 rl(", which it WOULD then
      // resolve to url() — a second decode the input never asked for.
      const result = sanitizeDescriptionHtml('<div style="background:\\5c 75 rl(https://ok.example/x)">a</div>');
      expect(result).not.toContain("\\75 rl(");
    });

    it("keeps a benign CSS escape byte-identical", () => {
      const input = '<div style="content:\\201C">a</div>';
      expect(sanitizeDescriptionHtml(input)).toBe(input);
    });

    // A stylesheet is preprocessed before tokenizing: CR, CRLF and FF all become
    // a single LF, and one such newline then terminates a hexadecimal escape. A
    // filter that treats CRLF as two characters leaves the second half inside
    // the identifier and reads a split name where a browser reads a whole one.
    // Real product descriptions are stored with CRLF, so this is the line ending
    // this content actually has.
    describe("CSS escapes terminated by a line break", () => {
      const CRLF = "\r\n";
      it.each([
        `<style>body{background:u\\72${CRLF}l(https://evil.example/x)}</style>`,
        `<style>@\\69${CRLF}mport "https://evil.example/x";</style>`,
        `<div style="background:u\\72${CRLF}l(https://evil.example/x)">a</div>`,
        `<style>body{background:u\\72\rl(https://evil.example/x)}</style>`,
        `<style>body{background:u\\72\nl(https://evil.example/x)}</style>`,
        `<style>body{background:u\\72\fl(https://evil.example/x)}</style>`,
      ])("neutralises %j", (input) => {
        expect(sanitizeDescriptionHtml(input)).not.toMatch(/evil\.example/);
      });

      it("still preserves a CRLF @media block byte-identical", () => {
        const input =
          `<style>@media (max-width: 768px) {.desc-x .product-title {${CRLF}` +
          `                font-size: 32px;${CRLF}            }}</style>`;
        expect(sanitizeDescriptionHtml(input)).toBe(input);
      });
    });

    // Character references are resolved in ONE pass, as a tokenizer does. Chained
    // passes let the output of one become the input of the next, which
    // re-segments the references that follow rather than merely over-decoding
    // them, and a run a browser rebuilds into a fetch was read as harmless.
    it("resolves character references in a single pass", () => {
      const input = "<style>body{background:&#117r&#92&#x36&#X43&#x28https://evil.example/x)}</style>";
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/evil\.example/);
    });

    it("does not fold a reference into the digits of the one before it", () => {
      // "&#92" followed by a literal "6" is U+005C then "6"; reading it as
      // "&#926" is a different string entirely.
      const input = '<div style="background:&#117r&#92&#x36&#X43&#x28https://evil.example/x)">a</div>';
      expect(sanitizeDescriptionHtml(input)).not.toMatch(/evil\.example/);
    });

    it("does not blank a stylesheet over whitespace before a parenthesis", () => {
      // "url (x)" is an identifier, a space and a block: it fetches nothing, so
      // matching it would only discard legitimate stylesheets that mention it.
      const input = "<style>/* the url ( token is documented above */.a{color:red}</style>";
      expect(sanitizeDescriptionHtml(input)).toBe(input);
    });
  });

  // Companion guard to the one above, for the normalisation passes. They run on
  // the same content, on every storefront render inside a CPU-metered Worker, so
  // a superlinear form here would undo the bound the scan already has. Each
  // shape is dense in exactly what one decoder looks for. Measured at ~0.45 s
  // total, so the budget leaves roughly six times the headroom while a return to
  // seconds fails immediately.
  it("resolves character references and escapes in linear time", () => {
    // Half the shapes carry a productId: the admin save paths sanitize with one,
    // and that turns on selector scoping, which the other half never reaches.
    const shapes: [string, string | undefined][] = [
      // CSS escape resolution
      ["<style>" + "\\".repeat(400000), undefined],
      ["<style>" + "\\".repeat(400000), "prod-1"],
      ["<style>" + "\\75 ".repeat(120000), undefined],
      ["<style>" + "\\75 ".repeat(120000), "prod-1"],
      ["<style>" + "\\ffffff".repeat(60000), "prod-1"],
      ["<style>" + "a{\\75 }".repeat(60000), "prod-1"],
      ['<p style="' + "\\".repeat(400000) + '">', undefined],
      // line-break folding ahead of escape resolution
      ["<style>" + "\\72\r\n".repeat(80000), undefined],
      ["<style>" + "\r\n".repeat(200000), "prod-1"],
      // character-reference resolution
      ["<style>" + "&#106;".repeat(80000), undefined],
      ["<style>" + "&#x6a;".repeat(80000), "prod-1"],
      ["<style>" + "&lpar;".repeat(80000), undefined],
      ["<style>" + "&".repeat(400000), "prod-1"],
      ["<style>&#" + "9".repeat(400000) + ";", undefined],
      ["<style>&#x" + "f".repeat(400000) + ";", undefined],
      ["<style>&" + "a".repeat(400000) + ";", undefined],
      ["<style>" + "&#92&#x36".repeat(50000), "prod-1"],
      ['<a href="' + "&#106;".repeat(80000) + '">x</a>', undefined],
      // near-miss on every alternative of the resource-fetch pattern
      ["<style>" + "url ".repeat(120000), undefined],
      ["<style>" + "image-set ".repeat(48000), "prod-1"],
    ];
    const started = Date.now();
    for (const [shape, productId] of shapes) sanitizeDescriptionHtml(shape, productId);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(3000);
  }, 30000);

  it("keeps a long generated style block byte-identical", () => {
    const id = "prod-7f3a91c2";
    const rules: string[] = [];
    for (let i = 0; i < 400; i++) {
      rules.push(`.desc-${id} .blk-${i}, .desc-${id} .blk-${i} > p { margin: 0 0 ${i % 24}px; color: #183c78; }`);
    }
    const media = `@media (max-width: 640px) {\n.desc-${id} .blk-0 { padding: 0; }\n}`;
    const input = `<style>\n${rules.join("\n")}\n${media}\n</style>\n<p>Autonomie 12 h.<br/>Livraison à Abidjan.</p>`;
    const result = sanitizeDescriptionHtml(input);
    expect(result).toContain(`.desc-${id} .blk-399`);
    expect(result).toContain("@media (max-width: 640px)");
    expect(result).toContain("<p>Autonomie 12 h.<br>Livraison à Abidjan.</p>");
    expect(result).not.toContain("<style><style>");
  });

  // Non-regression against the shape real product descriptions actually have:
  // a ~56 KB generated <style> block wrapped in @media, with CRLF line endings
  // and selectors that repeat their own scope prefix. Normalising values before
  // filtering them must leave this untouched to the byte — @media is the one
  // construct every one of these descriptions relies on.
  it("leaves a realistic generated description byte-identical", () => {
    const id = "9xMa0DwOqDK4l2Cm9v--r";
    const rules: string[] = [];
    for (let i = 0; i < 220; i++) {
      rules.push(
        `.desc-${id} .blk-${i} .product-title {\r\n                font-size: ${24 + (i % 12)}px;\r\n            }` +
          `.desc-${id} .desc-${id} .blk-${i} .price-section {\r\n                flex-direction: column;\r\n                gap: ${i % 8}px;\r\n            }`,
      );
    }
    const input =
      `<style>@media (max-width: 768px) {${rules.join("")}}</style>` +
      `<p>Écran AMOLED 6,7 pouces. Autonomie 2 jours.</p>` +
      `<p><a href="/c/telephones">Voir la catégorie</a></p>`;
    expect(input.length).toBeGreaterThan(50_000);
    expect(sanitizeDescriptionHtml(input)).toBe(input);

    // The admin save paths sanitize WITH a product id and persist the result, so
    // that path carries real content too. Selector scoping reshapes it — that is
    // pre-existing behaviour — but nothing may be blanked by the filters.
    const scoped = sanitizeDescriptionHtml(input, id);
    expect(scoped).toContain("@media (max-width: 768px)");
    expect(scoped).toContain("flex-direction: column");
    expect(scoped).toContain(".blk-219");
    expect(scoped.length).toBeGreaterThan(50_000);
  });

  // The shape the seven production descriptions actually have, at their real
  // size: ~15 KB of CSS with CRLF line endings, selectors that already repeat
  // their own scope prefix, a @media block and a @keyframes rule. The storefront
  // read path passes no productId, so that direction must stay byte-identical;
  // the admin save paths pass one and persist the result, so that direction is
  // what must come back as CSS a browser will accept.
  describe("a realistic generated description with @media and @keyframes", () => {
    const id = "9xMa0DwOqDK4l2Cm9v--r";
    const CRLF = "\r\n";

    function buildDescription(): string {
      const rules: string[] = [];
      for (let i = 0; i < 120; i++) {
        rules.push(
          `.desc-${id} .blk-${i} .product-title {${CRLF}                font-size: ${24 + (i % 12)}px;${CRLF}            }` +
            `.desc-${id} .desc-${id} .blk-${i} .price-section {${CRLF}                flex-direction: column;${CRLF}            }`,
        );
      }
      // The comment is not decoration: the generator emits it, six of the seven
      // products have one in exactly this position, and it is what made them
      // unrepairable while the at-rule test skipped whitespace only.
      const keyframes =
        `/* Animation d'entrée */${CRLF}        ` +
        `@keyframes neterekaFadeIn {${CRLF}` +
        `                from { opacity: 0; transform: translateY(8px); }${CRLF}` +
        `                to { opacity: 1; transform: translateY(0); }${CRLF}` +
        `            }` +
        `@keyframes neterekaPulse {${CRLF}` +
        `                0%, 100% { transform: scale(1); }${CRLF}` +
        `                50% { transform: scale(1.04); }${CRLF}` +
        `            }`;
      return (
        `<style>${keyframes}@media (max-width: 768px) {${rules.join("")}}</style>` +
        `<p>Écran AMOLED 6,7 pouces. Autonomie 2 jours.</p>`
      );
    }

    // Also green before the fix, and deliberately so: it is the non-regression
    // pin for the read path, not evidence of the defect. Scoping has always
    // been gated behind `if (productId)`, and this asserts that rewriting what
    // is inside that branch did not move the gate.
    it("is byte-identical on the storefront read path (no productId)", () => {
      const input = buildDescription();
      expect(input.length).toBeGreaterThan(14_000);
      expect(sanitizeDescriptionHtml(input)).toBe(input);
    });

    it("leaves every keyframe step unprefixed on the admin save path", () => {
      const scoped = sanitizeDescriptionHtml(buildDescription(), id);

      // The failure mode being pinned is a scope prefix welded onto a step
      // selector or onto an at-rule prelude — both make the browser drop the
      // whole rule. Assert on what precedes each construct, not merely that the
      // construct is still present somewhere.
      expect(scoped).toContain("@keyframes neterekaFadeIn {");
      expect(scoped).toContain("@keyframes neterekaPulse {");
      expect(scoped).toContain("@media (max-width: 768px) {");
      expect(scoped).not.toMatch(/\.desc-[\w-]+\s+@/);
      expect(scoped).not.toMatch(/\.desc-[\w-]+\s+(?:from|to)\s*\{/);
      expect(scoped).not.toMatch(/\.desc-[\w-]+\s+[\d.]+%/);

      // …and the selectors that ARE selectors still carry exactly one scope.
      expect(scoped).toContain(`.desc-${id} .blk-119 .product-title {`);
      expect(scoped).not.toContain(`.desc-${id} .desc-${id} .desc-${id}`);
    });
  });
});
