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

export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Kept alongside `frame-ancestors 'self'`, and load-bearing today.
  //
  // CSP3 § 6.4.2.2 is not a "browsers may differ" situation, it is a rule:
  // "the frame-ancestors directive overrides the X-Frame-Options header. If a
  // resource is delivered with a policy that includes a directive named
  // frame-ancestors AND WHOSE DISPOSITION IS 'enforce', then the
  // X-Frame-Options header will be ignored, per HTML's processing model."
  //
  // The qualifier is what matters here. Our policy's disposition is `report`,
  // so the override does not apply and a report-only frame-ancestors blocks
  // nothing: X-Frame-Options is currently the *only* control actually
  // preventing this site from being framed. Removing it because "the CSP
  // covers framing" would drop clickjacking protection to zero.
  //
  // The consequence to plan for: the moment `frame-ancestors 'self'` ships in
  // an ENFORCING policy — which is exactly what the recommended second header
  // does — every browser implementing CSP ignores this header outright, and it
  // survives only for any that do not. At that point the two must still agree
  // ('self' ≡ SAMEORIGIN, as they do), or it becomes a dead header stating a
  // rule nobody applies. A test asserts both are present and equivalent.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Resolves the `report-to csp-endpoint` group above. Reporting API v1
  // parses this value against the response's own URL, so a same-origin path
  // is valid and avoids hard-coding the deployment hostname.
  { key: "Reporting-Endpoints", value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"` },
  { key: CSP_HEADER_KEY, value: CONTENT_SECURITY_POLICY },
];
