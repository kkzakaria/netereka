import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

const MAX_REPORTS_PER_WINDOW = 20;
const WINDOW_SECONDS = 600; // 10 minutes

/**
 * Per-client throttle on the CSP violation collector (`/api/csp-report`).
 *
 * Unlike the order and promo limiters, this one is keyed on the client IP
 * rather than a user id, because the endpoint is unauthenticated by nature —
 * browsers post violation reports with no credentials, so there is no session
 * to key on. `cf-connecting-ip` is set by Cloudflare's edge and cannot be
 * forged by the client, so it is the only address header worth trusting here
 * (`x-forwarded-for` is caller-supplied and would make the limiter trivially
 * evadable).
 *
 * The CGNAT concern that ruled out IP keying for orders (many Ivorian mobile
 * customers share one egress address) applies here too, but with the opposite
 * conclusion: over-throttling a shared address costs us some *telemetry*, not
 * a customer's order. Losing reports is an acceptable failure mode; letting an
 * unauthenticated endpoint drive unbounded logging and KV traffic is not.
 *
 * 20 per 10 minutes is generous for a real browser — a user agent coalesces
 * violations per (directive, blocked URL) pair, so a genuinely broken page
 * produces a handful of reports, not a stream — while capping a flood at two
 * KV writes a minute per address. Once the window is saturated
 * `checkKVRateLimit` stops writing entirely and only reads, so a sustained
 * flood degrades to one KV read per request.
 */
export async function checkCspReportRateLimit(kv: KVNamespace, clientKey: string): Promise<boolean> {
  // Bound the key: the caller derives it from a header, and an oversized KV
  // key is a rejected write rather than a stored counter.
  const safeKey = clientKey.slice(0, 64);
  return checkKVRateLimit(kv, `csp-report:rate:${safeKey}`, {
    max: MAX_REPORTS_PER_WINDOW,
    windowSeconds: WINDOW_SECONDS,
  });
}
