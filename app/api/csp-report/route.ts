import { getEnv } from "@/lib/cloudflare/context";
import {
  checkCspReportRateLimit,
  clientAttributionLabel,
  clientNetworkKey,
} from "@/lib/rate-limit/csp-report";

/**
 * Collector for Content-Security-Policy violation reports.
 *
 * The policy in `lib/security/headers.ts` is delivered report-only. Without a
 * collector, "report-only" means "written to the browser console of whoever
 * happened to be looking", which in production is nobody. This route turns
 * those violations into Worker logs that can actually be read before deciding
 * whether the policy is safe to enforce.
 *
 * This endpoint is unauthenticated by design — a browser posts violation
 * reports with no credentials and no session, so there is nothing to
 * authenticate. What bounds it instead:
 *
 *  - only POST is exported, so every other method gets a 405 from Next.js;
 *  - the `Content-Type` must be one of the two the browsers actually send;
 *    anything else is rejected with 415 before a single byte of body is read;
 *  - the body is read through a counting reader and abandoned past 8 KB, and
 *    the whole read is under a deadline, so neither a large upload nor a
 *    stream that never ends can pin the handler. The 415 above is the only
 *    rejection that is not logged, because it is decided *before* the limiter
 *    and logging it would be the unbounded write the limiter exists to stop;
 *  - a per-network fixed window (`lib/rate-limit/csp-report.ts`) caps how many
 *    reports one network can have logged, and any failure of that check drops
 *    the report rather than letting it through;
 *  - at most `MAX_REPORTS_PER_REQUEST` entries of a batch are logged, and each
 *    logged field is truncated, so the log volume per accepted request is
 *    bounded regardless of what the payload contains;
 *  - the response is always an empty 204 on the accepted path, so the endpoint
 *    is not an oracle for anything.
 *
 * ---------------------------------------------------------------------------
 * Trusting what lands here
 * ---------------------------------------------------------------------------
 * A violation report cannot be authenticated. It arrives without credentials,
 * every field in it is chosen by whoever sends it, and a browser's report is
 * byte-for-byte reproducible by a script. That matters more here than it
 * looks, because the whole point of the report-only rollout is that an
 * operator reads this log for weeks and then decides whether to enforce: an
 * outsider who can write into the log can steer that decision, and a poisoned
 * log looks exactly like a healthy one.
 *
 * So this route does not try to authenticate reports. It sorts them, and
 * labels each line with how much it is worth:
 *
 *  - a report whose `document-uri` / `documentURL` names an origin that is
 *    neither ours nor opaque is discarded rather than logged as a violation,
 *    and the discard is logged once per request under its own message;
 *  - a report from an *opaque* origin (`about:srcdoc`, `about:blank`, a
 *    sandboxed or `data:` document — all of which serialise their origin as
 *    the string "null") is **accepted** and marked `documentScope:
 *    "opaque-origin"`. Those are not foreign: a `srcdoc` frame inherits this
 *    policy, and `components/admin/html-editor.tsx` renders one, so it is a
 *    surface the CSP genuinely needs telemetry from;
 *  - a payload we cannot read at all — too large, too slow, not JSON, or not
 *    a shape either wire format defines — is logged too, under its own
 *    message and reason. Silence has to mean "nothing happened", not "we
 *    threw something away without saying so";
 *  - every logged line carries the network it came from and the wire format
 *    it arrived in, so a reader can tell one flooding source from a genuine
 *    spread of browsers.
 *
 * **The origin filter authenticates nothing.** This is the part that must not
 * be misread. `document-uri` is a field the sender chooses, so anyone can put
 * one of our URLs in it — a plain `curl` with `document-uri:
 * https://netereka.ci/x` is logged as accepted, with no presence on the site
 * required. What the filter buys is cost: it removes casual and accidental
 * noise, and it means seeding the log takes deliberate effort rather than a
 * stray misconfigured scanner. It is not evidence of provenance.
 *
 * Nothing inside a report is evidence either. A `blockedUrl` can be invented,
 * a directive name misattributed, a count inflated for any directive at will.
 * Read this log as a hint about *where to look*, never as proof: the
 * conclusion "GA4 needs origin X" has to be confirmed against the code before
 * the policy is widened for it. The one thing the log supports on its own is
 * the negative — a directive that stays quiet across weeks of real traffic is
 * probably safe, because silence cannot be forged into existence.
 */
export const dynamic = "force-dynamic";

/** Generous for a violation report; the largest field is a URL. */
const MAX_BODY_BYTES = 8 * 1024;
/** A `reports+json` batch can carry many entries; only log the first few. */
const MAX_REPORTS_PER_REQUEST = 10;
/** Every value below comes from the page under attack — never log it whole. */
const MAX_FIELD_CHARS = 256;
/**
 * Ceiling on the whole body read. A browser posts a few kilobytes over a live
 * connection; a stream that stays open past this is not a report, and without
 * a deadline it would hold the handler and its reader open indefinitely.
 */
const BODY_READ_TIMEOUT_MS = 5_000;

/**
 * The two media types user agents actually use.
 *  - `application/csp-report` — the legacy `report-uri` payload (Firefox, Safari).
 *  - `application/reports+json` — the Reporting API `report-to` batch (Chromium).
 * Anything else is not a browser and is refused.
 */
const ACCEPTED_CONTENT_TYPES = new Set(["application/csp-report", "application/reports+json"]);

interface NormalisedViolation {
  documentUrl: string;
  effectiveDirective: string;
  blockedUrl: string;
  disposition: string;
  sourceFile: string;
}

/**
 * How much the document URL on a report is worth.
 *
 *  - `same-origin` — names one of this site's origins. Still not proof of
 *    provenance (see the module comment), just the ordinary case.
 *  - `opaque-origin` — `about:srcdoc`, `about:blank`, a `data:` document, or
 *    anything in a sandboxed frame; all serialise their origin as "null".
 *    Accepted and marked, because a `srcdoc` frame inherits our policy and is
 *    a surface we want reports from.
 *  - `foreign` — names some other site. Discarded.
 */
type DocumentScope = "same-origin" | "opaque-origin";

/** Why a payload was thrown away without yielding any violation. */
type UnreadableReason =
  | "too-large"
  | "timeout"
  | "read-failed"
  | "invalid-json"
  | "unrecognised-shape";

type BodyRead =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "timeout" | "read-failed" };

function truncate(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}…` : value;
}

/** `Content-Type` may carry parameters (`; charset=utf-8`) — compare the essence only. */
function contentTypeEssence(header: string | null): string {
  return (header ?? "").split(";", 1)[0].trim().toLowerCase();
}

function originOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Read at most `limit` bytes, within `BODY_READ_TIMEOUT_MS`. The stream is
 * cancelled — not drained — on either bound.
 */
async function readBoundedBody(request: Request, limit: number): Promise<BodyRead> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return { ok: false, reason: "too-large" };

  const body = request.body;
  if (!body) return { ok: true, text: "" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  const expired = Symbol("expired");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof expired>((resolve) => {
    timer = setTimeout(() => resolve(expired), BODY_READ_TIMEOUT_MS);
  });

  try {
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next === expired) {
        await reader.cancel();
        return { ok: false, reason: "timeout" };
      }
      const { done, value } = next;
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    // The client went away mid-upload, or the stream errored. Routine, not
    // exceptional — browsers abandon in-flight POSTs on navigation all the
    // time. Without this the rejection propagated out of POST and the request
    // ended as a 500 with nothing written, breaking both contracts this route
    // is built on: the constant 204 on the accepted path, and the rule that
    // nothing is dropped silently from the one log an operator is told to
    // read as meaningful.
    return { ok: false, reason: "read-failed" };
  } finally {
    clearTimeout(timer);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Legacy `report-uri` shape: `{ "csp-report": { "document-uri": ..., ... } }`. */
function fromCspReport(payload: unknown): NormalisedViolation[] {
  if (!isRecord(payload)) return [];
  const report = payload["csp-report"];
  if (!isRecord(report)) return [];
  return [
    {
      documentUrl: truncate(report["document-uri"]),
      effectiveDirective: truncate(report["effective-directive"] ?? report["violated-directive"]),
      blockedUrl: truncate(report["blocked-uri"]),
      disposition: truncate(report["disposition"]),
      sourceFile: truncate(report["source-file"]),
    },
  ];
}

/** Reporting API shape: an array of `{ type, url, body: { ... } }`. */
function fromReportsJson(payload: unknown): NormalisedViolation[] {
  if (!Array.isArray(payload)) return [];
  const violations: NormalisedViolation[] = [];
  for (const entry of payload) {
    if (violations.length >= MAX_REPORTS_PER_REQUEST) break;
    if (!isRecord(entry)) continue;
    if (entry.type !== "csp-violation") continue;
    const body = isRecord(entry.body) ? entry.body : {};
    violations.push({
      documentUrl: truncate(body.documentURL ?? entry.url),
      effectiveDirective: truncate(body.effectiveDirective),
      blockedUrl: truncate(body.blockedURL),
      disposition: truncate(body.disposition),
      sourceFile: truncate(body.sourceFile),
    });
  }
  return violations;
}

/**
 * The origins a genuine report about our policy can name as its document.
 *
 * The request's own origin is the primary source and needs no configuration:
 * the policy sets a same-origin `report-uri`, so a browser posts the report to
 * the very origin that served the document. `SITE_URL` is added when present
 * to cover a deployment whose canonical origin differs from the one the report
 * happened to reach.
 */
function trustedDocumentOrigins(request: Request, siteUrl: string | undefined): Set<string> {
  const origins = new Set<string>();
  const own = originOf(request.url);
  if (own) origins.add(own);
  if (siteUrl) {
    const configured = originOf(siteUrl);
    if (configured) origins.add(configured);
  }
  return origins;
}

/**
 * Sort a report by what its document URL names. See `DocumentScope`.
 *
 * The opaque case is the one worth spelling out: an `about:srcdoc` document
 * has no origin of its own, so `new URL(...).origin` gives the string "null".
 * An earlier version compared that against our origins, found no match, and
 * filed it as a forgery — which lost telemetry from the admin HTML preview
 * (whose srcdoc frame inherits this policy) *and* showed the operator
 * fabricated-traffic where there was none. Marking beats discarding: an
 * attacker can also claim an opaque origin, but the label keeps that claim
 * readable as a separate population instead of contaminating either bucket.
 */
function classifyDocument(rawUrl: string, trusted: Set<string>): DocumentScope | "foreign" {
  const origin = originOf(rawUrl);
  if (origin === null) return "foreign";
  if (trusted.has(origin)) return "same-origin";
  if (origin === "null") return "opaque-origin";
  return "foreign";
}

export async function POST(request: Request): Promise<Response> {
  const contentType = contentTypeEssence(request.headers.get("content-type"));
  if (!ACCEPTED_CONTENT_TYPES.has(contentType)) {
    return new Response(null, { status: 415 });
  }

  const clientAddress = request.headers.get("cf-connecting-ip") ?? "";
  // Two identifiers, on purpose. The limiter counts against the precise
  // network; only the coarsened label is ever written to the log. See
  // `clientAttributionLabel`.
  const network = clientNetworkKey(clientAddress);
  const reporterNetwork = clientAttributionLabel(clientAddress);

  // Rate-limit before reading the body: a throttled caller costs one KV read.
  // Any failure here — no KV binding, KV unavailable, a write rejected because
  // the same key was written twice in a second — drops the report. Losing
  // telemetry is the correct failure mode for an unauthenticated collector;
  // logging unconditionally when the limiter is unavailable is not.
  let allowed = false;
  let siteUrl: string | undefined;
  try {
    const env = await getEnv();
    siteUrl = env.SITE_URL;
    const kv = env.KV;
    if (kv) allowed = await checkCspReportRateLimit(kv, network);
  } catch {
    allowed = false;
  }
  if (!allowed) return new Response(null, { status: 204 });

  const format = contentType === "application/reports+json" ? "reports+json" : "report-uri";

  /**
   * One line, one request, past the limiter — the same bound the discard path
   * already has. These used to be silent returns, which made the operator's
   * instruction to treat quiet as reassuring unsafe: an absence of violations
   * and an absence of *readable input* looked identical in the log.
   */
  const reportUnreadable = (reason: UnreadableReason) => {
    console.warn("[csp-report] could not read a payload", {
      reason,
      reporterNetwork,
      format,
    });
  };

  const read = await readBoundedBody(request, MAX_BODY_BYTES);
  if (!read.ok) {
    reportUnreadable(read.reason);
    const status =
      read.reason === "timeout" ? 408 : read.reason === "too-large" ? 413 : 400;
    return new Response(null, { status });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(read.text);
  } catch {
    reportUnreadable("invalid-json");
    return new Response(null, { status: 400 });
  }

  const violations =
    contentType === "application/reports+json" ? fromReportsJson(payload) : fromCspReport(payload);
  if (violations.length === 0) {
    // Valid JSON, but not a shape either wire format defines. Distinct from a
    // forgery discard: "we could not read this" and "this did not come from
    // our site" lead the reader somewhere different.
    reportUnreadable("unrecognised-shape");
    return new Response(null, { status: 204 });
  }

  const trusted = trustedDocumentOrigins(request, siteUrl);
  const accepted: (NormalisedViolation & { documentScope: DocumentScope })[] = [];
  let discarded = 0;
  for (const violation of violations.slice(0, MAX_REPORTS_PER_REQUEST)) {
    const scope = classifyDocument(violation.documentUrl, trusted);
    if (scope === "foreign") discarded++;
    else accepted.push({ ...violation, documentScope: scope });
  }

  if (discarded > 0) {
    // One line per request, so this cannot be used to amplify the log itself.
    // It is logged rather than swallowed because an attempt to seed the record
    // the enforcement decision rests on is itself worth seeing.
    console.warn("[csp-report] discarded reports not from one of this site's origins", {
      count: discarded,
      reporterNetwork,
      format,
    });
  }

  for (const violation of accepted) {
    // Structured, not interpolated: every field is page-controlled, and
    // serialising them as an object keeps newlines from forging log lines.
    // `reporterNetwork`, `format` and `documentScope` are ours, not the
    // payload's — they are what lets a reader separate one noisy source from a
    // real spread, and a frame that inherits our policy from the main document.
    console.warn("[csp-report] violation", { ...violation, reporterNetwork, format });
  }

  return new Response(null, { status: 204 });
}
