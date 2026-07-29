import { getEnv } from "@/lib/cloudflare/context";
import { checkCspReportRateLimit, clientNetworkKey } from "@/lib/rate-limit/csp-report";

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
 *    stream that never ends can pin the handler;
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
 * So this route does not try to authenticate reports. It makes forgery
 * *visible* instead:
 *
 *  - a report whose `document-uri` / `documentURL` is not one of this site's
 *    own origins is discarded, not logged as a violation. A genuine report
 *    about *our* policy is always emitted by a document served from *our*
 *    origin, so a foreign document URL is definitionally not ours;
 *  - the discard is itself logged once per request, under its own message, so
 *    an attempt to seed the log is visible rather than silent;
 *  - every accepted violation is logged with the network it was reported from
 *    and which wire format it arrived in, so a reader can tell one flooding
 *    source from a genuine spread of browsers.
 *
 * What remains untrustworthy, and must stay in the reader's mind: within a
 * same-origin report, the individual fields are still attacker-chosen. A
 * `blockedUrl` can be invented, a directive name can be misattributed, and an
 * on-site actor can inflate the count for any directive they like. Treat this
 * log as evidence of *what to go and check*, never as proof on its own — the
 * conclusion "GA4 needs origin X" should be confirmed against the code before
 * the policy is widened for it.
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

type BodyRead =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "timeout" };

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

export async function POST(request: Request): Promise<Response> {
  const contentType = contentTypeEssence(request.headers.get("content-type"));
  if (!ACCEPTED_CONTENT_TYPES.has(contentType)) {
    return new Response(null, { status: 415 });
  }

  const network = clientNetworkKey(request.headers.get("cf-connecting-ip") ?? "");

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

  const read = await readBoundedBody(request, MAX_BODY_BYTES);
  if (!read.ok) return new Response(null, { status: read.reason === "timeout" ? 408 : 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(read.text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const format = contentType === "application/reports+json" ? "reports+json" : "report-uri";
  const violations =
    contentType === "application/reports+json" ? fromReportsJson(payload) : fromCspReport(payload);

  const trusted = trustedDocumentOrigins(request, siteUrl);
  const sameOrigin: NormalisedViolation[] = [];
  let discarded = 0;
  for (const violation of violations.slice(0, MAX_REPORTS_PER_REQUEST)) {
    const documentOrigin = originOf(violation.documentUrl);
    if (documentOrigin && trusted.has(documentOrigin)) sameOrigin.push(violation);
    else discarded++;
  }

  if (discarded > 0) {
    // One line per request, so this cannot be used to amplify the log itself.
    // It is logged rather than swallowed because an attempt to seed the record
    // the enforcement decision rests on is itself worth seeing.
    console.warn("[csp-report] discarded reports not from one of this site's origins", {
      count: discarded,
      reporterNetwork: network,
      format,
    });
  }

  for (const violation of sameOrigin) {
    // Structured, not interpolated: every field is page-controlled, and
    // serialising them as an object keeps newlines from forging log lines.
    // `reporterNetwork` and `format` are ours, not the payload's — they are
    // what lets a reader separate one noisy source from a real spread.
    console.warn("[csp-report] violation", { ...violation, reporterNetwork: network, format });
  }

  return new Response(null, { status: 204 });
}
