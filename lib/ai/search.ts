import { getCloudflareContext } from "@opennextjs/cloudflare";

interface BraveSearchResult {
  web?: { results?: Array<{ description?: string; title?: string }> };
}

export async function searchProductSpecs(query: string): Promise<string> {
  const { env } = await getCloudflareContext();
  if (!env.BRAVE_SEARCH_API_KEY) return "";

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + " specifications fiche technique")}&count=3&text_decorations=false`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
    },
  });

  if (!res.ok) return "";

  const data = (await res.json()) as BraveSearchResult;
  const snippets = data.web?.results
    ?.map((r) => [r.title, r.description].filter(Boolean).join(" — "))
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");

  return snippets ?? "";
}
