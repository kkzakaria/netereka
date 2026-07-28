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

    it("neutralizes a handler hidden behind a '<' inside an attribute value", () => {
      const result = sanitizeDescriptionHtml('<p a="<img src=x onerror=alert(1)>">');
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

  // Guard against a return of the pathological scan cost: these shapes used to
  // take tens of seconds each, and the pass runs on every storefront render of
  // a product description inside a CPU-metered Worker. The budget is ~40x the
  // measured cost so ordinary CI noise cannot trip it, while a return to
  // seconds fails immediately.
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
});
