import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  checkCspReportRateLimit: vi.fn(),
}));

vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));
// Only the limiter is stubbed. `clientNetworkKey` stays real, because the
// address the limiter is keyed on is part of what these tests assert.
vi.mock("@/lib/rate-limit/csp-report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit/csp-report")>()),
  checkCspReportRateLimit: mocks.checkCspReportRateLimit,
}));

import { POST } from "@/app/api/csp-report/route";

const KV = {} as KVNamespace;
const SITE_URL = "https://netereka.ci";

function post(body: BodyInit, contentType: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/csp-report", {
    method: "POST",
    headers: { "content-type": contentType, ...headers },
    body,
    // Required by undici whenever the body is a stream.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

function cspReport(fields: Record<string, unknown>): string {
  return JSON.stringify({
    "csp-report": {
      "document-uri": `${SITE_URL}/p/telephone`,
      "violated-directive": "script-src",
      "effective-directive": "script-src-elem",
      "blocked-uri": "https://cdn.example.test/x.js",
      disposition: "report",
      "source-file": `${SITE_URL}/p/telephone`,
      ...fields,
    },
  });
}

const CSP_REPORT_BODY = cspReport({});

// Silenced for the whole file: the route logs every accepted violation, and
// the assertions below inspect this spy rather than the terminal.
const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

/** The route logs `console.warn("<message>", <structured payload>)`. */
function logged(call: number): Record<string, unknown> {
  return warn.mock.calls[call][1] as Record<string, unknown>;
}

function loggedMessages(): string[] {
  return warn.mock.calls.map((call) => String(call[0]));
}

function violationLogs(): Record<string, unknown>[] {
  return warn.mock.calls
    .filter((call) => String(call[0]).includes("violation"))
    .map((call) => call[1] as Record<string, unknown>);
}

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockResolvedValue({ KV, SITE_URL });
    mocks.checkCspReportRateLimit.mockResolvedValue(true);
  });

  describe("what it accepts", () => {
    it("accepts the legacy report-uri payload and logs the violation", async () => {
      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report"));

      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(1);
      expect(logged(0)).toMatchObject({
        documentUrl: `${SITE_URL}/p/telephone`,
        effectiveDirective: "script-src-elem",
        blockedUrl: "https://cdn.example.test/x.js",
      });
    });

    it("accepts the Reporting API batch payload", async () => {
      const body = JSON.stringify([
        {
          type: "csp-violation",
          url: `${SITE_URL}/`,
          body: {
            documentURL: `${SITE_URL}/`,
            effectiveDirective: "img-src",
            blockedURL: "https://cdn.example.test/pixel.png",
            disposition: "report",
          },
        },
        // Reporting API batches mix report types; only csp-violation is ours.
        { type: "deprecation", url: `${SITE_URL}/`, body: {} },
      ]);

      const res = await POST(post(body, "application/reports+json"));

      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(1);
      expect(logged(0)).toMatchObject({ effectiveDirective: "img-src", format: "reports+json" });
    });

    it("tolerates a charset parameter on the content type", async () => {
      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report; charset=utf-8"));
      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(1);
    });

    it("accepts a document served from the origin the report was posted to", async () => {
      // No SITE_URL configured: the request's own origin still has to work,
      // because the policy posts reports back to the origin that served the page.
      mocks.getEnv.mockResolvedValue({ KV });

      const res = await POST(
        post(cspReport({ "document-uri": "http://localhost/panier" }), "application/csp-report")
      );

      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(1);
    });
  });

  describe("resisting forged reports", () => {
    // A violation report cannot be authenticated, and the operator is told to
    // read this log for weeks before deciding whether to enforce. Anything a
    // stranger can write into it steers that decision, so forgery has to be
    // visible rather than indistinguishable.

    it("discards a report claiming to come from a foreign document", async () => {
      const res = await POST(
        post(
          cspReport({ "document-uri": "https://attacker.example/seed" }),
          "application/csp-report"
        )
      );

      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(0);
    });

    it("says so in the log rather than discarding silently", async () => {
      await POST(
        post(
          cspReport({ "document-uri": "https://attacker.example/seed" }),
          "application/csp-report",
          { "cf-connecting-ip": "203.0.113.7" }
        )
      );

      expect(loggedMessages()[0]).toContain("discarded");
      expect(logged(0)).toMatchObject({ count: 1, reporterNetwork: "203.0.113.7" });
    });

    it("discards a report with no document URL at all", async () => {
      const res = await POST(
        post(JSON.stringify({ "csp-report": { "blocked-uri": "inline" } }), "application/csp-report")
      );

      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(0);
    });

    it("marks a forged batch once, not once per entry", async () => {
      const body = JSON.stringify(
        Array.from({ length: 8 }, () => ({
          type: "csp-violation",
          url: "https://attacker.example/",
          body: { documentURL: "https://attacker.example/", effectiveDirective: "img-src" },
        }))
      );

      await POST(post(body, "application/reports+json"));

      expect(warn.mock.calls).toHaveLength(1);
      expect(logged(0)).toMatchObject({ count: 8 });
    });

    it("records the reporting network and wire format on accepted violations", async () => {
      // What lets a reader tell one flooding source from a genuine spread of
      // browsers. Both fields are ours, not the payload's.
      await POST(post(CSP_REPORT_BODY, "application/csp-report", { "cf-connecting-ip": "198.51.100.4" }));

      expect(logged(0)).toMatchObject({ reporterNetwork: "198.51.100.4", format: "report-uri" });
    });
  });

  describe("what bounds it", () => {
    it("rejects a content type no browser sends, without reading the body", async () => {
      const res = await POST(post(CSP_REPORT_BODY, "application/json"));

      expect(res.status).toBe(415);
      expect(mocks.checkCspReportRateLimit).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it("rejects a body larger than the cap", async () => {
      const oversized = cspReport({ "blocked-uri": "x".repeat(16 * 1024) });

      const res = await POST(post(oversized, "application/csp-report"));

      expect(res.status).toBe(413);
      expect(warn).not.toHaveBeenCalled();
    });

    it("drops the report when the rate limit is exhausted", async () => {
      mocks.checkCspReportRateLimit.mockResolvedValue(false);

      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report"));

      // 204, not 429: the endpoint should not tell a flooder anything about
      // its own state.
      expect(res.status).toBe(204);
      expect(warn).not.toHaveBeenCalled();
    });

    it("keys the rate limit on cf-connecting-ip, which the client cannot forge", async () => {
      await POST(
        post(CSP_REPORT_BODY, "application/csp-report", {
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "1.2.3.4",
        })
      );

      expect(mocks.checkCspReportRateLimit).toHaveBeenCalledWith(KV, "203.0.113.7");
    });

    it("counts an IPv6 client against its network, not its address", async () => {
      // A single /64 holds 2^64 addresses; keying on the address would give a
      // flooder an unlimited supply of fresh buckets, each one a billed write.
      await POST(
        post(CSP_REPORT_BODY, "application/csp-report", {
          "cf-connecting-ip": "2001:0db8:1234:5678:dead:beef:0000:0001",
        })
      );

      expect(mocks.checkCspReportRateLimit).toHaveBeenCalledWith(KV, "2001:db8:1234:5678::/64");
    });

    it("drops the report rather than logging it when the limiter is unavailable", async () => {
      mocks.getEnv.mockRejectedValue(new Error("no cloudflare context"));

      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report"));

      expect(res.status).toBe(204);
      expect(warn).not.toHaveBeenCalled();
    });

    it("drops the report when there is no KV binding to count against", async () => {
      mocks.getEnv.mockResolvedValue({});

      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report"));

      expect(res.status).toBe(204);
      expect(mocks.checkCspReportRateLimit).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it("caps how many entries of one batch reach the log", async () => {
      const body = JSON.stringify(
        Array.from({ length: 50 }, (_, i) => ({
          type: "csp-violation",
          url: `${SITE_URL}/`,
          body: { documentURL: `${SITE_URL}/`, effectiveDirective: `img-src-${i}` },
        }))
      );

      const res = await POST(post(body, "application/reports+json"));

      expect(res.status).toBe(204);
      expect(violationLogs().length).toBeLessThanOrEqual(10);
    });

    it("truncates page-controlled fields instead of logging them whole", async () => {
      const body = cspReport({ "blocked-uri": `https://cdn.example.test/${"a".repeat(4000)}` });

      const res = await POST(post(body, "application/csp-report"));

      expect(res.status).toBe(204);
      expect(String(logged(0).blockedUrl).length).toBeLessThanOrEqual(257);
    });

    it("rejects a body that is not JSON", async () => {
      const res = await POST(post("not json at all", "application/csp-report"));

      expect(res.status).toBe(400);
      expect(warn).not.toHaveBeenCalled();
    });

    it("logs nothing for a well-formed JSON body that carries no violation", async () => {
      const res = await POST(post(JSON.stringify({ hello: "world" }), "application/csp-report"));

      expect(res.status).toBe(204);
      expect(violationLogs()).toHaveLength(0);
    });
  });

  describe("a body that never ends", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("abandons the read on a deadline instead of holding the handler open", async () => {
      // Without a deadline, a request that opens a stream and never closes it
      // pins the handler and its reader indefinitely — no byte cap helps,
      // because no byte ever arrives.
      let cancelled = false;
      const stalled = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("{"));
          // ...and then nothing, ever.
        },
        cancel() {
          cancelled = true;
        },
      });

      vi.useFakeTimers();
      const pending = POST(post(stalled, "application/csp-report"));
      await vi.advanceTimersByTimeAsync(6_000);
      const res = await pending;

      expect(res.status).toBe(408);
      expect(cancelled).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
