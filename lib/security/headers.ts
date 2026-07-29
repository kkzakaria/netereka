/**
 * Response security headers, including the Content-Security-Policy.
 *
 * They live here rather than inline in `next.config.ts` so they can be
 * asserted by a unit test: `next.config.ts` calls
 * `initOpenNextCloudflareForDev()` at module load, which makes it awkward to
 * import from a test, and the policy below is exactly the kind of value that
 * drifts silently if nothing pins it.
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
  /** Product and banner images (`lib/utils/images.ts`, `NEXT_PUBLIC_R2_URL`). */
  r2: "https://r2.netereka.ci",
  /** GA4 loader (`components/analytics/google-analytics.tsx`). */
  googleTagManager: "https://www.googletagmanager.com",
} as const;

const { turnstile, r2, googleTagManager } = CSP_ALLOWED_ORIGINS;

/**
 * The policy, one directive per entry.
 *
 * `frame-src` lists only Turnstile: the sanitizer strips `<script>` and
 * `<iframe>` from stored HTML outright (`sanitize-html.ts`), so no product
 * description can introduce a frame.
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
  `frame-src ${turnstile}`,
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
  // Kept alongside `frame-ancestors 'self'` rather than replaced by it.
  // Two reasons. First, a report-only policy enforces nothing at all, so
  // while the CSP is in observation mode X-Frame-Options is the *only* thing
  // actually preventing framing. Second, even once enforced, CSP3 § 6.4.2.2
  // only describes frame-ancestors as "similar to" X-Frame-Options and leaves
  // the interaction to browsers: a browser that honours frame-ancestors
  // ignores X-Frame-Options, and one that does not falls back to it. The two
  // values are kept deliberately equivalent ('self' ≡ SAMEORIGIN) so no
  // browser can end up with a weaker rule than another — a test asserts both
  // are present.
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
