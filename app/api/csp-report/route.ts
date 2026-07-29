import { getEnv } from "@/lib/cloudflare/context";
import { checkCspReportRateLimit } from "@/lib/rate-limit/csp-report";

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
 *  - the body is read through a counting reader and abandoned past 8 KB, so a
 *    large upload is cancelled rather than buffered;
 *  - a per-IP fixed window (`lib/rate-limit/csp-report.ts`) caps how many
 *    reports one address can have logged, and any failure of that check drops
 *    the report rather than letting it through;
 *  - at most `MAX_REPORTS_PER_REQUEST` entries of a batch are logged, and each
 *    logged field is truncated, so the log volume per accepted request is
 *    bounded regardless of what the payload contains;
 *  - the response is always an empty 204 on the accepted path, so the endpoint
 *    is not an oracle for anything.
 */
export const dynamic = "force-dynamic";

/** Generous for a violation report; the largest field is a URL. */
const MAX_BODY_BYTES = 8 * 1024;
/** A `reports+json` batch can carry many entries; only log the first few. */
const MAX_REPORTS_PER_REQUEST = 10;
/** Every value below comes from the page under attack — never log it whole. */
const MAX_FIELD_CHARS = 256;

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

function truncate(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}…` : value;
}

/** `Content-Type` may carry parameters (`; charset=utf-8`) — compare the essence only. */
function contentTypeEssence(header: string | null): string {
  return (header ?? "").split(";", 1)[0].trim().toLowerCase();
}

/**
 * Read at most `limit` bytes. Returns null if the body is (or claims to be)
 * larger, cancelling the stream instead of draining it.
 */
async function readBoundedBody(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;

  const body = request.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
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

export async function POST(request: Request): Promise<Response> {
  const contentType = contentTypeEssence(request.headers.get("content-type"));
  if (!ACCEPTED_CONTENT_TYPES.has(contentType)) {
    return new Response(null, { status: 415 });
  }

  // Rate-limit before reading the body: a throttled caller costs one KV read.
  // Any failure here — no KV binding, KV unavailable, a write rejected because
  // the same key was written twice in a second — drops the report. Losing
  // telemetry is the correct failure mode for an unauthenticated collector;
  // logging unconditionally when the limiter is unavailable is not.
  let allowed = false;
  try {
    const env = await getEnv();
    const kv = env.KV;
    if (kv) {
      const clientKey = request.headers.get("cf-connecting-ip") ?? "unknown";
      allowed = await checkCspReportRateLimit(kv, clientKey);
    }
  } catch {
    allowed = false;
  }
  if (!allowed) return new Response(null, { status: 204 });

  const raw = await readBoundedBody(request, MAX_BODY_BYTES);
  if (raw === null) return new Response(null, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const violations =
    contentType === "application/reports+json" ? fromReportsJson(payload) : fromCspReport(payload);

  for (const violation of violations.slice(0, MAX_REPORTS_PER_REQUEST)) {
    // Structured, not interpolated: every field is page-controlled, and
    // serialising them as an object keeps newlines from forging log lines.
    console.warn("[csp-report] violation", violation);
  }

  return new Response(null, { status: 204 });
}
