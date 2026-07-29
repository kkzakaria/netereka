import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  CSP_ALLOWED_ORIGINS,
  CSP_HEADER_KEY,
  CSP_REPORT_GROUP,
  CSP_REPORT_PATH,
  securityHeaders,
} from "@/lib/security/headers";

// next.config.ts calls this at module load; it wants a real wrangler config
// and a dev server, neither of which exists in a unit test.
vi.mock("@opennextjs/cloudflare", () => ({ initOpenNextCloudflareForDev: vi.fn() }));

import nextConfig from "@/next.config";

/**
 * These tests pin the Content-Security-Policy in both directions.
 *
 * Loosening it — adding an origin, dropping `object-src 'none'` — is the
 * obvious risk. Tightening it is the less obvious one: flipping the header to
 * enforcement, or removing `'unsafe-inline'` from `style-src`, would break
 * production silently and with the best of intentions. Both directions fail
 * here.
 *
 * Every assertion below reads the headers **that `next.config.ts` actually
 * serves**, not the constant they are defined from. That distinction is the
 * whole point: an earlier version of this file asserted the constant only, and
 * stayed green — 11 of 11 — while `next.config.ts` was mutated to serve an
 * empty header list, dropping the CSP, HSTS, X-Content-Type-Options,
 * X-Frame-Options, Referrer-Policy, Permissions-Policy and COOP in one edit.
 * A test that pins a value nobody proved is served pins nothing.
 */

interface ServedHeader {
  key: string;
  value: string;
}

const headerRules = (await nextConfig.headers?.()) ?? [];
const catchAllRule = headerRules.find((rule) => rule.source === "/:path*");
const servedHeaders = (catchAllRule?.headers ?? []) as ServedHeader[];

function header(key: string): string | undefined {
  return servedHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

/** Parsed from the served policy, so an unserved policy fails every assertion. */
function directive(name: string): string[] | null {
  for (const part of (header(CSP_HEADER_KEY) ?? "").split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens[0] === name) return tokens.slice(1);
  }
  return null;
}

describe("next.config.ts wiring", () => {
  it("serves the security headers on every route", () => {
    expect(headerRules).toHaveLength(1);
    expect(catchAllRule).toBeDefined();
    expect(servedHeaders).toEqual(securityHeaders);
  });

  it("serves the policy the constant defines, byte for byte", () => {
    expect(header(CSP_HEADER_KEY)).toBe(CONTENT_SECURITY_POLICY);
  });
});

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
    expect(header("Content-Security-Policy-Report-Only")).toBeTruthy();
    expect(servedHeaders.some((h) => h.key.toLowerCase() === "content-security-policy")).toBe(false);
  });

  it("keeps X-Frame-Options alongside frame-ancestors, and equivalent to it", () => {
    // CSP3 § 6.4.2.2: an *enforced* frame-ancestors overrides X-Frame-Options,
    // which "will be ignored". Our disposition is `report`, so that override
    // does not apply and X-Frame-Options is currently the only control
    // actually preventing framing. Once the recommended enforcing second
    // header ships, the two swap roles — so they must keep saying the same
    // thing ('self' ≡ SAMEORIGIN).
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

  it("keeps frame-src at least as wide as the default it replaces", () => {
    // Naming frame-src stops it falling back to default-src, so omitting
    // 'self' would make a directive aimed at third parties narrower than the
    // default — and the only casualty would be first-party frames such as the
    // admin HTML preview.
    expect(directive("frame-src")).toEqual(["'self'", CSP_ALLOWED_ORIGINS.turnstile]);
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
    for (const part of (header(CSP_HEADER_KEY) ?? "").split(";")) {
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
    const served = header(CSP_HEADER_KEY) ?? "";
    expect(served).not.toContain("\n");
    expect(served).not.toContain(";;");
    // Every directive name appears exactly once — a duplicate directive is
    // ignored by browsers, which is a silent way to lose a restriction.
    const names = served.split(";").map((p) => p.trim().split(/\s+/)[0]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("image origin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("tracks NEXT_PUBLIC_R2_URL rather than restating the bucket host", async () => {
    // One origin, one source of truth. If the bucket ever moves, the policy
    // moves with it instead of silently blocking every product image.
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "https://cdn.example.test/products");
    vi.resetModules();

    const reloaded = await import("@/lib/security/headers");

    expect(reloaded.CSP_ALLOWED_ORIGINS.r2).toBe("https://cdn.example.test");
    expect(reloaded.CONTENT_SECURITY_POLICY).toContain("https://cdn.example.test");
  });

  it("falls back to the known bucket origin when the variable is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "");
    vi.resetModules();

    const reloaded = await import("@/lib/security/headers");

    expect(reloaded.CSP_ALLOWED_ORIGINS.r2).toBe("https://r2.netereka.ci");
  });
});
