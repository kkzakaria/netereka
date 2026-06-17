/** Pure builders for the Google Merchant Center product feed (RSS 2.0 + g: namespace). */

export function escapeXml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatPrice(amount: number): string {
  return `${amount} XOF`;
}

export function availabilityFor(stockQuantity: number): "in_stock" | "out_of_stock" {
  return stockQuantity > 0 ? "in_stock" : "out_of_stock";
}

/** Internal category slug → Google product category numeric ID.
 *  IDs verified against taxonomy-with-ids.en-US.txt (2026-06-17). */
export const GOOGLE_CATEGORY_MAP: Record<string, number> = {
  smartphones: 267, // Electronics > Communications > Telephony > Mobile Phones
  tablettes: 4745, // Electronics > Computers > Tablet Computers
  ordinateurs: 278, // Electronics > Computers
  televiseurs: 404, // Electronics > Video > Televisions
  televisions: 404,
  ecouteurs: 543626, // Electronics > Audio > ... > Headphones
  "montres-connectees": 201, // Apparel & Accessories > Jewelry > Watches (closest leaf)
  imprimantes: 500106, // Electronics > Print, Copy, Scan & Fax > Printers, Copiers & Fax Machines
  projecteurs: 396, // Electronics > Video > Projectors
  gaming: 1294, // Electronics > Video Game Consoles
  jeux: 1279, // Software > Video Game Software
  reseau: 342, // Electronics > Networking
  accessoires: 2082, // Electronics > Electronics Accessories
};

export function googleCategoryFor(
  categorySlug: string | null | undefined,
  parentCategorySlug: string | null | undefined
): number | undefined {
  if (categorySlug && GOOGLE_CATEGORY_MAP[categorySlug] !== undefined) {
    return GOOGLE_CATEGORY_MAP[categorySlug];
  }
  if (parentCategorySlug && GOOGLE_CATEGORY_MAP[parentCategorySlug] !== undefined) {
    return GOOGLE_CATEGORY_MAP[parentCategorySlug];
  }
  return undefined;
}

/** Ensure a URL is absolute. `siteUrl` must have no trailing slash. */
export function absolutize(url: string | null | undefined, siteUrl: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return url.startsWith("/") ? `${siteUrl}${url}` : `${siteUrl}/${url}`;
}
