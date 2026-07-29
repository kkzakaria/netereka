import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  checkCspReportRateLimit: vi.fn(),
}));

vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));
vi.mock("@/lib/rate-limit/csp-report", () => ({
  checkCspReportRateLimit: mocks.checkCspReportRateLimit,
}));

import { POST } from "@/app/api/csp-report/route";

const KV = {} as KVNamespace;

function post(body: string, contentType: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/csp-report", {
    method: "POST",
    headers: { "content-type": contentType, ...headers },
    body,
  });
}

const CSP_REPORT_BODY = JSON.stringify({
  "csp-report": {
    "document-uri": "https://netereka.ci/p/telephone",
    "violated-directive": "script-src",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://evil.example/x.js",
    disposition: "report",
    "source-file": "https://netereka.ci/p/telephone",
  },
});

// Silenced for the whole file: the route logs every accepted violation, and
// the assertions below inspect this spy rather than the terminal.
const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

/** The route logs `console.warn("[csp-report] violation", violation)`. */
function loggedViolation(call: number): Record<string, string> {
  return warn.mock.calls[call][1] as Record<string, string>;
}

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockResolvedValue({ KV });
    mocks.checkCspReportRateLimit.mockResolvedValue(true);
  });

  describe("what it accepts", () => {
    it("accepts the legacy report-uri payload and logs the violation", async () => {
      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report"));

      expect(res.status).toBe(204);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(loggedViolation(0)).toMatchObject({
        documentUrl: "https://netereka.ci/p/telephone",
        effectiveDirective: "script-src-elem",
        blockedUrl: "https://evil.example/x.js",
      });
    });

    it("accepts the Reporting API batch payload", async () => {
      const body = JSON.stringify([
        {
          type: "csp-violation",
          url: "https://netereka.ci/",
          body: {
            documentURL: "https://netereka.ci/",
            effectiveDirective: "img-src",
            blockedURL: "https://cdn.example/pixel.png",
            disposition: "report",
          },
        },
        // Reporting API batches mix report types; only csp-violation is ours.
        { type: "deprecation", url: "https://netereka.ci/", body: {} },
      ]);

      const res = await POST(post(body, "application/reports+json"));

      expect(res.status).toBe(204);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(loggedViolation(0)).toMatchObject({ effectiveDirective: "img-src" });
    });

    it("tolerates a charset parameter on the content type", async () => {
      const res = await POST(post(CSP_REPORT_BODY, "application/csp-report; charset=utf-8"));
      expect(res.status).toBe(204);
      expect(warn).toHaveBeenCalledTimes(1);
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
      const oversized = JSON.stringify({ "csp-report": { "blocked-uri": "x".repeat(16 * 1024) } });

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
          url: "https://netereka.ci/",
          body: { effectiveDirective: `img-src-${i}` },
        }))
      );

      const res = await POST(post(body, "application/reports+json"));

      expect(res.status).toBe(204);
      expect(warn.mock.calls.length).toBeLessThanOrEqual(10);
    });

    it("truncates page-controlled fields instead of logging them whole", async () => {
      const body = JSON.stringify({
        "csp-report": { "blocked-uri": `https://evil.example/${"a".repeat(4000)}` },
      });

      const res = await POST(post(body, "application/csp-report"));

      expect(res.status).toBe(204);
      expect(loggedViolation(0).blockedUrl.length).toBeLessThanOrEqual(257);
    });

    it("rejects a body that is not JSON", async () => {
      const res = await POST(post("not json at all", "application/csp-report"));

      expect(res.status).toBe(400);
      expect(warn).not.toHaveBeenCalled();
    });

    it("logs nothing for a well-formed JSON body that carries no violation", async () => {
      const res = await POST(post(JSON.stringify({ hello: "world" }), "application/csp-report"));

      expect(res.status).toBe(204);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
