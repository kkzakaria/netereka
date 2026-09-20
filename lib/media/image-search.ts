/**
 * Brave Image Search wrapper.
 *
 * Anchors an MCP tool's product research in reality: the client (the model)
 * calls this to find candidate image URLs, then judges their relevance
 * itself — there is no server-side vision filtering pass here, the MCP
 * client's own vision does that triage.
 *
 * Free tier: 2000 queries/month, 1 query/sec. We do not enforce client-side
 * rate-limiting — Brave returns 429 which we surface verbatim.
 *
 * Docs: https://api.search.brave.com/app/documentation/image-search/get-started
 */

import { getEnv } from "@/lib/cloudflare/context";

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/images/search";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_COUNT = 20;
const DEFAULT_COUNT = 10;

export interface ImageSearchInput {
  query: string;
  count?: number;
}

export interface ImageSearchResultItem {
  url: string;
  source_domain: string;
  title: string;
  thumbnail_url: string | null;
}

export type ImageSearchResult =
  | { ok: true; results: ImageSearchResultItem[] }
  | {
      ok: false;
      reason:
        | "no_api_key"
        | "invalid_input"
        | "auth_failed"
        | "rate_limited"
        | "upstream_error"
        | "parse_failed"
        | "timeout"
        | "fetch_failed";
    };

interface BraveItem {
  title?: string;
  url?: string;
  source?: string;
  thumbnail?: { src?: string };
  properties?: { url?: string };
}

/**
 * Hit Brave Image Search and normalize results into a stable shape for the
 * model. Per Brave's schema, `properties.url` is the direct image URL while
 * the top-level `url` is the page hosting the image (HTML). We require
 * `properties.url` and skip items missing it — feeding HTML page URLs into
 * `image_candidates` reintroduces the `bad_content_type` failure mode the
 * upstream pipeline was hardened against.
 *
 * Reads its own key from the `BRAVE_API_KEY` secret so a caller (the future
 * MCP tool) has nothing to pass in.
 */
export async function searchImages(
  input: ImageSearchInput,
  opts: { timeoutMs?: number } = {},
): Promise<ImageSearchResult> {
  const env = await getEnv();
  const apiKey = env.BRAVE_API_KEY ?? null;
  if (!apiKey) return { ok: false, reason: "no_api_key" };

  // Validate before any work — Anthropic only best-effort enforces input_schema,
  // so a malformed model payload reaches us as untyped JSON. Without this, a
  // null/missing `query` would either crash (TypeError on `input.count`) or
  // build a `q=undefined` URL that Brave silently returns as 0 results.
  if (
    !input ||
    typeof input.query !== "string" ||
    input.query.trim().length < 2
  ) {
    return { ok: false, reason: "invalid_input" };
  }

  const count = Math.max(1, Math.min(MAX_COUNT, input.count ?? DEFAULT_COUNT));
  const url = new URL(BRAVE_ENDPOINT);
  url.searchParams.set("q", input.query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("safesearch", "strict");

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(url.toString(), {
      signal: ac.signal,
      headers: {
        accept: "application/json",
        "x-subscription-token": apiKey,
      },
    });

    if (resp.status === 401 || resp.status === 403) return { ok: false, reason: "auth_failed" };
    if (resp.status === 429) return { ok: false, reason: "rate_limited" };
    if (!resp.ok) return { ok: false, reason: "upstream_error" };

    let json: { results?: BraveItem[] };
    try {
      json = (await resp.json()) as { results?: BraveItem[] };
    } catch {
      // 200 with non-JSON body → distinct from network failure so an operator
      // can tell "Brave is broken / proxy returned an HTML error page" apart
      // from "DNS / TCP failed".
      return { ok: false, reason: "parse_failed" };
    }

    if (json?.results === undefined) {
      // 200 OK but no `results` field — likely Brave shipped a v2 schema. Log
      // so the next deploy-tail catches the drift instead of silently returning
      // 0 results forever.
      console.warn("[image-search] Brave 200 OK but no `results` field — schema drift?", {
        keys: Object.keys(json ?? {}),
      });
    }

    const items = (json?.results ?? [])
      .map((item): ImageSearchResultItem | null => {
        // Strict: only direct image URLs. Brave's top-level `url` is the
        // hosting HTML page, which would 404 / serve text/html on our fetch.
        const directUrl = item.properties?.url;
        if (!directUrl) return null;
        const domain = item.source ?? safeDomain(directUrl);
        // Drop items with unparseable URL — empty `source_domain` defeats the
        // model's filtering pass (it can't distinguish manufacturer from
        // listicle if both are empty).
        if (!domain) return null;
        return {
          url: directUrl,
          source_domain: domain,
          title: (item.title ?? "").trim(),
          thumbnail_url: item.thumbnail?.src ?? null,
        };
      })
      .filter((x): x is ImageSearchResultItem => x !== null);

    return { ok: true, results: items };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

function safeDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "";
  }
}
