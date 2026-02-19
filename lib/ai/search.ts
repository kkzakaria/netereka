import { getCloudflareContext } from "@opennextjs/cloudflare";

// ─── Response shapes ──────────────────────────────────────────────────────────

interface BraveSearchResult {
  web?: { results?: Array<{ title?: string; description?: string }> };
}

interface GoogleSearchResult {
  items?: Array<{ title?: string; snippet?: string }>;
}

interface BraveImageSearchResult {
  results?: Array<{ thumbnail?: { src?: string } }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SPECS_LENGTH = 1000;
const SEARCH_SUFFIX = " specifications fiche technique";
const FETCH_TIMEOUT_MS = 5000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetch product specs from Brave Search.
 * Returns a non-empty string on success, or "" on API error / no results.
 * Throws on network / timeout errors so the caller can decide to fallback.
 */
async function searchWithBrave(query: string, apiKey: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + SEARCH_SUFFIX)}&count=3&text_decorations=false`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    console.error(
      `[ai/search] Brave returned ${res.status} for query="${query}". ` +
        "Check BRAVE_SEARCH_API_KEY validity and quota."
    );
    return "";
  }

  let data: BraveSearchResult;
  try {
    data = (await res.json()) as BraveSearchResult;
  } catch {
    console.error(
      `[ai/search] Brave returned non-JSON body for query="${query}" (status=${res.status})`
    );
    return "";
  }

  if (!data.web?.results?.length) {
    console.warn(`[ai/search] Brave returned 0 results for query="${query}"`);
    return "";
  }

  return data.web.results
    .map((r) => [r.title, r.description].filter(Boolean).join(" — "))
    .filter(Boolean)
    .slice(0, 3)
    .join("\n")
    .slice(0, MAX_SPECS_LENGTH);
}

/**
 * Fetch product specs from Google Custom Search JSON API.
 * Returns a non-empty string on success, or "" on API error / no results.
 * Throws on network / timeout errors so the caller can decide to give up.
 */
async function searchWithGoogle(
  query: string,
  apiKey: string,
  engineId: string
): Promise<string> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(query + SEARCH_SUFFIX)}&num=3`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    console.error(
      `[ai/search] Google Custom Search returned ${res.status} for query="${query}". ` +
        "Check GOOGLE_SEARCH_API_KEY validity and quota."
    );
    return "";
  }

  let data: GoogleSearchResult;
  try {
    data = (await res.json()) as GoogleSearchResult;
  } catch {
    console.error(
      `[ai/search] Google Custom Search returned non-JSON body for query="${query}" (status=${res.status})`
    );
    return "";
  }

  if (!data.items?.length) {
    console.warn(`[ai/search] Google Custom Search returned 0 results for query="${query}"`);
    return "";
  }

  return data.items
    .map((r) => [r.title, r.snippet].filter(Boolean).join(" — "))
    .filter(Boolean)
    .slice(0, 3)
    .join("\n")
    .slice(0, MAX_SPECS_LENGTH);
}

/**
 * Fetch product images from Brave Image Search.
 * Returns up to 3 thumbnail URLs, or [] on any failure.
 */
async function searchImagesWithBrave(
  query: string,
  apiKey: string
): Promise<string[]> {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=3&safesearch=strict`;

  let data: BraveImageSearchResult;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(
        `[ai/search] Brave Image Search returned ${res.status} for query="${query}"`
      );
      return [];
    }

    data = (await res.json()) as BraveImageSearchResult;
  } catch (err) {
    console.error("[ai/search] Brave Image Search threw:", err);
    return [];
  }

  return (data.results ?? [])
    .map((r) => r.thumbnail?.src ?? "")
    .filter(Boolean)
    .slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search for real product specifications using Brave Search (primary) with
 * Google Custom Search as a fallback. Returns "" if both are unavailable or
 * fail, so callers can proceed without web context.
 *
 * Setup:
 *   Primary  — BRAVE_SEARCH_API_KEY (https://brave.com/search/api, 2000 req/month free)
 *   Fallback — GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID
 *              (https://developers.google.com/custom-search/v1/overview, 100 req/day free)
 */
export async function searchProductSpecs(query: string): Promise<string> {
  const { env } = await getCloudflareContext();

  // ── Primary: Brave Search ──────────────────────────────────────────────────
  if (env.BRAVE_SEARCH_API_KEY) {
    try {
      const result = await searchWithBrave(query, env.BRAVE_SEARCH_API_KEY);
      if (result) return result;
      console.warn("[ai/search] Brave returned empty — trying Google fallback");
    } catch (err) {
      console.error("[ai/search] Brave Search threw, trying Google fallback:", err);
    }
  }

  // ── Fallback: Google Custom Search ────────────────────────────────────────
  if (env.GOOGLE_SEARCH_API_KEY && env.GOOGLE_SEARCH_ENGINE_ID) {
    try {
      const result = await searchWithGoogle(
        query,
        env.GOOGLE_SEARCH_API_KEY,
        env.GOOGLE_SEARCH_ENGINE_ID
      );
      if (result) return result;
    } catch (err) {
      console.error("[ai/search] Google Custom Search also failed:", err);
    }
  }

  if (!env.BRAVE_SEARCH_API_KEY && !env.GOOGLE_SEARCH_API_KEY) {
    console.warn("[ai/search] No search API key configured — skipping web enrichment");
  }

  return "";
}

/**
 * Search for product images using Brave Image Search.
 * Returns an array of thumbnail URLs (max 3), or [] if unavailable.
 */
export async function searchProductImages(query: string): Promise<string[]> {
  const { env } = await getCloudflareContext();

  if (env.BRAVE_SEARCH_API_KEY) {
    return searchImagesWithBrave(query, env.BRAVE_SEARCH_API_KEY);
  }

  console.warn("[ai/search] No BRAVE_SEARCH_API_KEY — skipping image search");
  return [];
}
