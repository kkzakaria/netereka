import { getCloudflareContext } from "@opennextjs/cloudflare";

interface BraveSearchResult {
  web?: { results?: Array<{ description?: string; title?: string }> };
}

const MAX_SPECS_LENGTH = 1000;

export async function searchProductSpecs(query: string): Promise<string> {
  const { env } = await getCloudflareContext();
  if (!env.BRAVE_SEARCH_API_KEY) {
    console.warn("[ai/search] BRAVE_SEARCH_API_KEY not set — skipping web enrichment");
    return "";
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + " specifications fiche technique")}&count=3&text_decorations=false`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    console.error(
      `[ai/search] Brave Search API returned ${res.status} for query="${query}". ` +
        "Check BRAVE_SEARCH_API_KEY validity and quota."
    );
    return "";
  }

  let data: BraveSearchResult;
  try {
    data = (await res.json()) as BraveSearchResult;
  } catch {
    console.error(
      `[ai/search] Brave Search returned non-JSON body for query="${query}" (status=${res.status})`
    );
    return "";
  }

  if (!data.web?.results?.length) {
    console.warn(`[ai/search] Brave Search returned 0 results for query="${query}"`);
    return "";
  }

  const snippets = data.web.results
    .map((r) => [r.title, r.description].filter(Boolean).join(" — "))
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");

  return snippets.slice(0, MAX_SPECS_LENGTH);
}
