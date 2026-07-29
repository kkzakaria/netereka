/**
 * Response security headers, including the Content-Security-Policy.
 *
 * They live here rather than inline in `next.config.ts` so they can be
 * asserted by a unit test — the policy below is exactly the kind of value that
 * drifts silently if nothing pins it. `__tests__/unit/security/headers.test.ts`
 * pins both this module *and* the wiring: it imports `next.config.ts` (mocking
 * `initOpenNextCloudflareForDev`) and asserts these headers are what the
 * config actually serves. Pinning the constant alone was not enough — an
 * earlier version of the test stayed green while `next.config.ts` served an
 * empty header list.
 *
 * ---------------------------------------------------------------------------
 * Why a CSP at all
 * ---------------------------------------------------------------------------
 * Product descriptions are stored as HTML and rendered through
 * `dangerouslySetInnerHTML` after passing `lib/utils/sanitize-html.ts`. That
 * sanitizer is a regex-based model of how a browser tokenises HTML, decodes
 * character references and parses CSS. Every correction it has needed so far
 * came from the model being right about one decoding layer and wrong about
 * the context around it. A CSP is the one defence in this area that does not
 * depend on that model being complete.
 *
 * ---------------------------------------------------------------------------
 * Delivered as REPORT-ONLY, on purpose
 * ---------------------------------------------------------------------------
 * `Content-Security-Policy-Report-Only` observes and reports; it blocks
 * nothing. Do not flip this key to the enforcing `Content-Security-Policy`
 * without first resolving the `'unsafe-inline'` question below — see
 * `docs`/the task 4.3 report for the trade-off. A unit test fails if the key
 * changes, which is deliberate: switching to enforcement is a product
 * decision, not a refactor.
 *
 * `script-src` keeps `'unsafe-inline'` because Next.js App Router streams RSC
 * payloads through inline `<script>self.__next_f.push(...)</script>` blocks on
 * every page, next-themes injects an inline anti-flash script, and
 * `components/analytics/google-analytics.tsx` carries an inline
 * `<Script id="ga4-config">`. Removing it requires a per-request nonce, which
 * makes every response uncacheable.
 *
 * `style-src` keeps `'unsafe-inline'` for a different and more concrete
 * reason: seven products in production carry generated `<style>` blocks of
 * roughly 35 KB inside their description HTML, plus inline `style=` attributes
 * that the sanitizer explicitly allows, plus the admin HTML preview iframe
 * (`components/admin/html-editor.tsx`) whose srcdoc document inherits this
 * policy. Dropping `'unsafe-inline'` from `style-src` would visibly break the
 * catalogue. A nonce cannot help here either, because the style blocks come
 * out of the database, not out of our JSX. That is also why the CSP does NOT
 * close the CSS axis of the sanitizer's threat model: on `style-src` the
 * sanitizer remains the only barrier.
 */

/** Path of the route that receives violation reports (`app/api/csp-report/route.ts`). */
export const CSP_REPORT_PATH = "/api/csp-report";

/** Group name tying `report-to` to the `Reporting-Endpoints` header below. */
export const CSP_REPORT_GROUP = "csp-endpoint";

/** Fallback when `NEXT_PUBLIC_R2_URL` is unset — matches `wrangler.jsonc`'s bucket domain. */
const DEFAULT_R2_ORIGIN = "https://r2.netereka.ci";

/**
 * The origin (scheme + host + port) of the image bucket, read from the same
 * environment variable the image helpers use. `NEXT_PUBLIC_R2_URL` may carry a
 * path, so only its origin is kept — a CSP host-source must not include one.
 */
function r2Origin(): string {
  const configured = process.env.NEXT_PUBLIC_R2_URL;
  if (!configured) return DEFAULT_R2_ORIGIN;
  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_R2_ORIGIN;
  }
}

/**
 * Every external origin the policy is allowed to name, and why.
 *
 * Exported so the unit test can assert the policy names nothing beyond this
 * list — a CSP silently widened one origin at a time stops being a control.
 *
 * Deliberately absent, because they are *navigations* (the user leaves the
 * site) and not sub-resource fetches: `wa.me`, `accounts.google.com`,
 * `appleid.apple.com`, `graph.facebook.com`. Putting them in `connect-src`
 * would grant a real exfiltration channel for nothing in return.
 * `schema.org` is likewise absent: it is a JSON-LD `@context` *value*, never
 * fetched by the browser.
 */
export const CSP_ALLOWED_ORIGINS = {
  /** Turnstile widget script + its challenge iframe (`components/.../turnstile-captcha.tsx`). */
  turnstile: "https://challenges.cloudflare.com",
  /**
   * Product and banner images. Derived from `NEXT_PUBLIC_R2_URL` — the same
   * variable `lib/utils/images.ts` builds every image URL from — rather than
   * written out again here. Two independent spellings of one origin drift
   * apart silently, and the symptom would be a bucket move that blocks every
   * product image with no failing test to say so.
   */
  r2: r2Origin(),
  /** GA4 loader (`components/analytics/google-analytics.tsx`). */
  googleTagManager: "https://www.googletagmanager.com",
} as const;

const { turnstile, r2, googleTagManager } = CSP_ALLOWED_ORIGINS;

/**
 * The policy, one directive per entry.
 *
 * `frame-src` carries `'self'` plus Turnstile. `'self'` is not redundant:
 * naming `frame-src` at all stops it falling back to `default-src`, so
 * omitting `'self'` would leave this directive *narrower* than the default it
 * replaced — first-party frames such as the admin HTML preview
 * (`components/admin/html-editor.tsx`) would be the only casualty of a
 * directive meant to constrain third parties. No external frame beyond
 * Turnstile is needed: the sanitizer strips `<script>` and `<iframe>` from
 * stored HTML outright (`sanitize-html.ts`), so no product description can
 * introduce one.
 *
 * `font-src` needs no external origin: `next/font/google` self-hosts Inter at
 * build time under `/_next/static/media`.
 *
 * Both `report-uri` and `report-to` are set. `report-uri` is deprecated but is
 * what Firefox and Safari implement; `report-to` is what Chromium implements
 * and takes precedence where both are understood (CSP3 § 6.5.1).
 */
export const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${turnstile} ${googleTagManager}`,
  // 'unsafe-inline' is load-bearing here — see the module comment: seven
  // production products ship ~35 KB of generated <style> inside their
  // description HTML. Removing it breaks the catalogue visibly.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' ${r2} data: blob:`,
  "font-src 'self' data:",
  // GA4's *loader* only. Its measurement beacons go somewhere else — to
  // `www.google-analytics.com`, to regional hosts such as
  // `region1.google-analytics.com`, and to `*.analytics.google.com`; with
  // Google Signals enabled, `stats.g.doubleclick.net` joins them, and the
  // beacon falls back to an image request under `img-src` when `sendBeacon`
  // is unavailable. None of them are here, and that is a decision rather than
  // an oversight.
  //
  // They are expected to appear as violations during observation. Treat them
  // as the collector working, not as a defect to file.
  //
  // Not added, for two reasons. First, the discipline this policy is built on
  // is that an origin earns its place by being observed, not by being read
  // about — Google documents a wildcard list (`https://*.google-analytics.com`
  // and friends), and a wildcard is a materially wider grant than a host, so
  // it should be granted on evidence from this site rather than on a doc page.
  // Second, and decisively: the recommended enforcement path does not enforce
  // `connect-src` at all. The proposal is a second, enforcing header carrying
  // only `object-src`, `base-uri`, `form-action` and `frame-ancestors` — the
  // four that cost no caching — while this policy stays report-only. Analytics
  // therefore cannot be broken by following that path, whatever this line says.
  // If full enforcement is ever chosen instead, this is one of the entries that
  // must be settled from the collector's own logs first.
  `connect-src 'self' ${googleTagManager}`,
  `frame-src 'self' ${turnstile}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  `report-uri ${CSP_REPORT_PATH}`,
  `report-to ${CSP_REPORT_GROUP}`,
];

export const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

/**
 * Report-only, not enforcing. Pinned by `__tests__/unit/security/headers.test.ts`.
 */
export const CSP_HEADER_KEY = "Content-Security-Policy-Report-Only";

/**
 * The subset of the policy above that is actually ENFORCED, shipped as a
 * second header alongside it.
 *
 * A browser evaluates every policy it is given independently, so two headers
 * are two policies: the one above keeps observing everything, this one blocks
 * these four. That is the whole reason the split works.
 *
 * These four earn enforcement now because **none of them concerns a loaded
 * script**, which is what makes them free. Enforcing `script-src` would need a
 * per-request nonce, a nonce cannot be cached, and that would turn
 * `/p/[slug]` (ISR 1h), `/c/[slug]` (5min) and six 24h static pages into
 * dynamic renders. These four cost nothing of the sort.
 *
 * `base-uri 'none'` is the one worth naming. A `<base href>` silently
 * re-points every relative URL on the page — scripts, forms, links. The HTML
 * sanitizer does not allow a `<base>` tag, but this directive defends the
 * paths the sanitizer never sees, and it is not a duplicate of anything.
 *
 * Deliberately absent: `default-src`. Adding one would make this policy govern
 * every fetch, which is precisely the nonce problem this split exists to
 * avoid. The test suite fails if `default-src`, `script-src` or `style-src`
 * appears here, so a future well-meaning widening cannot land quietly.
 */
export const CSP_ENFORCED_DIRECTIVES: readonly string[] = [
  "object-src 'none'",
  "base-uri 'none'",
  // Safe for this codebase, and checked rather than assumed: every <form> uses
  // `action={serverAction}`, which React posts same-origin to the current
  // route, and no form carries a cross-origin URL action. Social sign-in is a
  // *navigation* (`authClient.signIn.social()` sets the location), and
  // `form-action` does not govern navigations.
  "form-action 'self'",
  "frame-ancestors 'self'",
];

export const CONTENT_SECURITY_POLICY_ENFORCED = CSP_ENFORCED_DIRECTIVES.join("; ");

/** Enforcing. See CSP_ENFORCED_DIRECTIVES for why only those four. */
export const CSP_ENFORCED_HEADER_KEY = "Content-Security-Policy";

export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Kept alongside `frame-ancestors 'self'`, and now mostly a fallback.
  //
  // CSP3 § 6.4.2.2 is not a "browsers may differ" situation, it is a rule:
  // "the frame-ancestors directive overrides the X-Frame-Options header. If a
  // resource is delivered with a policy that includes a directive named
  // frame-ancestors AND WHOSE DISPOSITION IS 'enforce', then the
  // X-Frame-Options header will be ignored, per HTML's processing model."
  //
  // That condition is now met. `frame-ancestors 'self'` ships in the ENFORCING
  // header below, so every browser implementing CSP ignores this line outright.
  //
  // It stays for two reasons rather than being deleted. It still works in any
  // agent that honours X-Frame-Options without implementing `frame-ancestors`,
  // and this audience is mobile-heavy in a market where old and embedded
  // browsers are not rare. And if the enforcing header is ever removed — by
  // accident or in a rollback — deleting this line would silently drop
  // clickjacking protection to zero rather than back to where it was.
  //
  // The two must therefore keep saying the same thing: 'self' ≡ SAMEORIGIN, as
  // they do. A test asserts both are present and equivalent, so they cannot
  // drift into a header stating a rule nobody applies.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Resolves the `report-to csp-endpoint` group above.
  //
  // The value is a root-relative path, and that is checked rather than
  // assumed — it was queried in review as something Chromium would ignore,
  // which would have left `report-to` dead in most of the traffic.
  //
  // It does not. Reporting API v1 § "Process reporting endpoints for response"
  // parses each value with "base URL set to response's url", and Chrome's own
  // documentation states the rule precisely: an endpoint URL "must start with
  // a slash (/). Relative paths are not supported." A *relative* path
  // (`reports/csp`) is unsupported; a root-relative one is exactly what is
  // asked for, and that is what this is.
  //
  // Relative is also the better choice here, not merely an adequate one. This
  // site serves both an apex and a `www` host (middleware 301s www → apex, but
  // the header is on that redirect response too). A path resolves against
  // whichever host served the document, so the report stays same-origin either
  // way. An absolute URL pinned to SITE_URL would make reports from `www`
  // cross-origin — which costs a CORS preflight and drops credentials — for no
  // gain.
  { key: "Reporting-Endpoints", value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"` },
  { key: CSP_HEADER_KEY, value: CONTENT_SECURITY_POLICY },
  // Two policies, deliberately. The one above observes everything and blocks
  // nothing; this one blocks four directives and observes nothing. Neither
  // weakens the other — a browser must satisfy every enforcing policy it is
  // given, and report-only policies never block.
  { key: CSP_ENFORCED_HEADER_KEY, value: CONTENT_SECURITY_POLICY_ENFORCED },
];
