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
