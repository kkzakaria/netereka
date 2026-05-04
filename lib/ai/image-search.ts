/**
 * Brave Image Search wrapper.
 *
 * Used as a custom Anthropic tool — when Claude calls `image_search` during
 * product research, the worker invokes this and returns the results back as
 * a tool_result block. The model then filters the candidates (rejecting
 * banner ads, listicles, watermarked promo shots, multi-product comparisons,
 * etc.) before emitting `image_candidates` in submit_product.
 *
 * Free tier: 2000 queries/month, 1 query/sec. We do not enforce client-side
 * rate-limiting — Brave returns 429 which we surface verbatim.
 *
 * Docs: https://api.search.brave.com/app/documentation/image-search/get-started
 */

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
  | { ok: false; reason: "no_api_key" | "auth_failed" | "rate_limited" | "upstream_error" | "timeout" | "fetch_failed" };

interface BraveItem {
  title?: string;
  url?: string;
  source?: string;
  thumbnail?: { src?: string };
  properties?: { url?: string };
}

/**
 * Hit Brave Image Search and normalize results into a stable shape for the
 * model. `properties.url` is the direct image URL when Brave found one;
 * `thumbnail.src` is Brave's CDN cache (always live, but small).
 */
export async function searchImages(
  input: ImageSearchInput,
  apiKey: string | null,
  opts: { timeoutMs?: number } = {},
): Promise<ImageSearchResult> {
  if (!apiKey) return { ok: false, reason: "no_api_key" };

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

    const json = (await resp.json()) as { results?: BraveItem[] };
    const items = (json.results ?? [])
      .map((item): ImageSearchResultItem | null => {
        // properties.url is the direct image URL; fall back to top-level url
        // (which is normally the page hosting the image, but some payloads
        // collapse the two for direct-image hits).
        const directUrl = item.properties?.url ?? item.url;
        if (!directUrl) return null;
        return {
          url: directUrl,
          source_domain: item.source ?? safeDomain(directUrl),
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
