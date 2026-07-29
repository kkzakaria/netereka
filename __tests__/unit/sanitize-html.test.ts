import { describe, it, expect } from "vitest";
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
});
