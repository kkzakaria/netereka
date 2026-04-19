import { nanoid } from "nanoid";
import { uploadToR2 } from "@/lib/storage/images";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type FetchImageResult =
  | { ok: true; key: string; contentType: string; size: number }
  | { ok: false; reason: "ssrf" | "bad_status" | "bad_content_type" | "too_large" | "timeout" | "fetch_failed" | "upload_failed" };

/**
 * Rejects URLs that could hit internal networks. DNS lookup is not available
 * inside Workers, so we rely on host-based heuristics: literal IP in private
 * ranges, or common internal hostnames. Any DNS name resolves to whatever the
 * Cloudflare edge resolves it to — this is a best-effort guard, not absolute.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "metadata.google.internal") return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  if (h.startsWith("[") && h.endsWith("]")) {
    const inner = h.slice(1, -1);
    if (inner === "::1" || inner.startsWith("fc") || inner.startsWith("fd") || inner.startsWith("fe80:")) return true;
  }
  return false;
}

const MAX_REDIRECTS = 3;

/**
 * Follow HTTP redirects manually so each Location target passes the SSRF host check
 * before we issue the next request. `redirect: "follow"` would let a public URL
 * bounce to a private IP and bypass the initial hostname validation.
 */
async function fetchWithSsrfSafeRedirects(
  initialUrl: URL,
  signal: AbortSignal,
): Promise<{ ok: true; resp: Response } | { ok: false; reason: "ssrf" | "fetch_failed" }> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const resp = await fetch(current.toString(), { signal, redirect: "manual" });
    const status = resp.status;
    if (status < 300 || status >= 400) return { ok: true, resp };

    const location = resp.headers.get("location");
    if (!location) return { ok: true, resp }; // 3xx without Location — treat as-is (caller will see bad_status)
    let next: URL;
    try { next = new URL(location, current); } catch { return { ok: false, reason: "fetch_failed" }; }
    if (next.protocol !== "http:" && next.protocol !== "https:") return { ok: false, reason: "ssrf" };
    if (isBlockedHost(next.hostname)) return { ok: false, reason: "ssrf" };
    current = next;
  }
  return { ok: false, reason: "fetch_failed" }; // redirect loop / cap exceeded
}

export async function fetchAndUploadImage(
  draftId: string,
  url: string,
): Promise<FetchImageResult> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, reason: "ssrf" }; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, reason: "ssrf" };
  if (isBlockedHost(parsed.hostname)) return { ok: false, reason: "ssrf" };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    let resp: Response;
    try {
      const r = await fetchWithSsrfSafeRedirects(parsed, ac.signal);
      if (!r.ok) return { ok: false, reason: r.reason };
      resp = r.resp;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
      return { ok: false, reason: "fetch_failed" };
    }

    if (!resp.ok) return { ok: false, reason: "bad_status" };

    const ct = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(ct)) return { ok: false, reason: "bad_content_type" };

    const reader = resp.body?.getReader();
    if (!reader) return { ok: false, reason: "fetch_failed" };

    // Keep the timeout active during body streaming — an oversized or slow image
    // can legitimately trip the abort mid-stream; reader.read() will reject with
    // AbortError, caught below and normalized to a structured result.
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > IMAGE_MAX_BYTES) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return { ok: false, reason: "too_large" };
        }
        chunks.push(value);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
      return { ok: false, reason: "fetch_failed" };
    }

    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { buffer.set(c, offset); offset += c.byteLength; }

    const ext = EXT_BY_TYPE[ct] ?? "jpg";
    const key = `products/${draftId}/${nanoid()}.${ext}`;
    const file = new File([buffer], key, { type: ct });
    try {
      await uploadToR2(file, key);
    } catch (err) {
      console.error("[ai-product] R2 upload failed for key", key, err);
      return { ok: false, reason: "upload_failed" };
    }

    return { ok: true, key, contentType: ct, size: total };
  } finally {
    clearTimeout(timer);
  }
}
