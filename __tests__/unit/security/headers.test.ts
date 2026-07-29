import { describe, it, expect } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  CSP_ALLOWED_ORIGINS,
  CSP_HEADER_KEY,
  CSP_REPORT_GROUP,
  CSP_REPORT_PATH,
  securityHeaders,
} from "@/lib/security/headers";

/**
 * These tests pin the Content-Security-Policy in both directions.
 *
 * Loosening it — adding an origin, dropping `object-src 'none'` — is the
 * obvious risk. Tightening it is the less obvious one: flipping the header to
 * enforcement, or removing `'unsafe-inline'` from `style-src`, would break
 * production silently and with the best of intentions. Both directions fail
 * here.
 */

function directive(name: string): string[] | null {
  for (const part of CONTENT_SECURITY_POLICY.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens[0] === name) return tokens.slice(1);
  }
  return null;
}

function header(key: string): string | undefined {
  return securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("security headers", () => {
  it("keeps the headers that predate the CSP", () => {
    expect(header("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(header("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("ships the policy report-only and never enforcing", () => {
    // A report-only policy blocks nothing. Moving to `Content-Security-Policy`
    // means every inline script must be nonced or hashed, which forces dynamic
    // rendering on a storefront that is currently cacheable. That is a product
    // decision — see the task 4.3 decision note — so it must not happen as a
    // side effect of an unrelated change.
    expect(CSP_HEADER_KEY).toBe("Content-Security-Policy-Report-Only");
    expect(header("Content-Security-Policy-Report-Only")).toBe(CONTENT_SECURITY_POLICY);
    expect(securityHeaders.some((h) => h.key.toLowerCase() === "content-security-policy")).toBe(false);
  });

  it("keeps X-Frame-Options alongside frame-ancestors", () => {
    // frame-ancestors in a *report-only* policy enforces nothing, so
    // X-Frame-Options is currently the only real anti-framing control. The two
    // must also stay equivalent, so that a browser honouring one is never
    // weaker than a browser honouring the other.
    expect(header("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(directive("frame-ancestors")).toEqual(["'self'"]);
  });

  it("declares a reporting endpoint the browsers can actually reach", () => {
    // Without this, "report-only" means "reported to a console nobody reads".
    expect(directive("report-uri")).toEqual([CSP_REPORT_PATH]);
    expect(directive("report-to")).toEqual([CSP_REPORT_GROUP]);
    expect(header("Reporting-Endpoints")).toBe(`${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`);
  });
});

describe("content security policy directives", () => {
  it("locks down the directives that cost nothing to set", () => {
    expect(directive("default-src")).toEqual(["'self'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("base-uri")).toEqual(["'none'"]);
    expect(directive("form-action")).toEqual(["'self'"]);
  });

  it("keeps 'unsafe-inline' in style-src", () => {
    // Seven products in production carry generated <style> blocks of roughly
    // 35 KB inside their description HTML, the sanitizer allows inline
    // `style=` attributes, and the admin HTML preview iframe's srcdoc document
    // inherits this policy. A nonce cannot rescue any of them, because the
    // styles come out of the database rather than out of our JSX. Removing
    // 'unsafe-inline' here breaks the catalogue visibly — and it is also why
    // the CSP does not close the CSS axis of the sanitizer's threat model.
    expect(directive("style-src")).toContain("'unsafe-inline'");
  });

  it("keeps 'unsafe-inline' in script-src until the nonce trade-off is settled", () => {
    // Next.js App Router streams RSC payloads through inline
    // <script>self.__next_f.push(...)</script> on every page, and
    // components/analytics/google-analytics.tsx carries an inline
    // <Script id="ga4-config">. Dropping this without a nonce would, under an
    // enforcing policy, break the whole application — not just analytics.
    expect(directive("script-src")).toContain("'unsafe-inline'");
  });

  it("puts each inventoried origin in the directive that needs it", () => {
    const { turnstile, r2, googleTagManager } = CSP_ALLOWED_ORIGINS;

    expect(directive("script-src")).toEqual(
      expect.arrayContaining(["'self'", turnstile, googleTagManager])
    );
    expect(directive("frame-src")).toEqual([turnstile]);
    expect(directive("img-src")).toEqual(
      expect.arrayContaining(["'self'", r2, "data:", "blob:"])
    );
    expect(directive("connect-src")).toEqual(
      expect.arrayContaining(["'self'", googleTagManager])
    );
    // next/font/google self-hosts Inter under /_next/static/media, so no
    // external font origin is needed.
    expect(directive("font-src")).toEqual(["'self'", "data:"]);
  });

  it("keeps navigation-only destinations out of connect-src", () => {
    // wa.me and the OAuth providers are places the *user* is sent, never
    // things the page fetches. Listing them would hand an injected script a
    // ready-made exfiltration channel in exchange for nothing.
    const connectSrc = directive("connect-src") ?? [];
    for (const navigationOnly of [
      "wa.me",
      "google.com",
      "appleid.apple.com",
      "graph.facebook.com",
      "schema.org",
    ]) {
      expect(connectSrc.some((source) => source.includes(navigationOnly))).toBe(false);
    }
  });

  it("names no origin outside the sanctioned inventory", () => {
    // Guards against the policy being widened one origin at a time until it
    // means nothing. Anything host-shaped in the policy must be either an
    // inventoried origin or the report path.
    const sanctioned = new Set<string>([
      ...Object.values(CSP_ALLOWED_ORIGINS),
      CSP_REPORT_PATH,
      CSP_REPORT_GROUP,
    ]);
    const keywords = /^('[a-z-]+'|data:|blob:|https:|http:)$/;

    const offenders: string[] = [];
    for (const part of CONTENT_SECURITY_POLICY.split(";")) {
      const [, ...sources] = part.trim().split(/\s+/).filter(Boolean);
      for (const source of sources) {
        if (keywords.test(source)) continue;
        if (sanctioned.has(source)) continue;
        offenders.push(source);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("serialises as a single well-formed header value", () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain("\n");
    expect(CONTENT_SECURITY_POLICY).not.toContain(";;");
    // Every directive name appears exactly once — a duplicate directive is
    // ignored by browsers, which is a silent way to lose a restriction.
    const names = CONTENT_SECURITY_POLICY.split(";").map((p) => p.trim().split(/\s+/)[0]);
    expect(new Set(names).size).toBe(names.length);
  });
});
