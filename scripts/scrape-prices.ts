/**
 * Scrape product prices from netereka.com/shop-full-width/ and update netereka_produits.md
 * Usage: npx tsx scripts/scrape-prices.ts
 */

import * as https from "node:https";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE_URL =
  "https://netereka.com/shop-full-width/?nocache=1770402042-8473&product-page=";
const TOTAL_PAGES = 30;
const MD_FILE = path.resolve(__dirname, "../netereka_produits.md");

// ── Fetch page HTML ──
function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchPage(res.headers.location!).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

// ── HTML entity decoder ──
function decodeEntities(s: string): string {
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8243;/g, "\u2033")
    .replace(/&#8242;/g, "\u2032")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();
}

// ── Parse price string → integer (CFA) ──
function parsePrice(raw: string): number {
  // "160 000" or "160&nbsp;000" → 160000
  const cleaned = raw.replace(/[^\d]/g, "");
  return parseInt(cleaned) || 0;
}

// ── Extract products from a page HTML ──
function extractProducts(
  html: string
): Array<{ name: string; price: number }> {
  const products: Array<{ name: string; price: number }> = [];

  // Split HTML by product list items: <li class="... product_cat-xxx ... product ...">
  const productRegex =
    /<li[^>]*class="[^"]*\bproduct\b[^"]*"[^>]*>([\s\S]*?)(?=<li[^>]*class="[^"]*\bproduct\b|<\/ul>|<nav\b)/g;
  let match;

  while ((match = productRegex.exec(html)) !== null) {
    const block = match[1];

    // Extract product name from <h2> tag
    const nameMatch = block.match(
      /<h2[^>]*woocommerce-loop-product__title[^>]*>([\s\S]*?)<\/h2>/
    );
    if (!nameMatch) continue;
    const name = decodeEntities(nameMatch[1]);
    if (!name) continue;

    // Extract first price amount (lowest price for variable products)
    const priceMatch = block.match(
      /<span class="woocommerce-Price-amount amount"><bdi>([\d\s.,&;nbsp]+)/
    );
    let price = 0;
    if (priceMatch) {
      price = parsePrice(decodeEntities(priceMatch[1]));
    }

    products.push({ name, price });
  }

  return products;
}

// ── Normalize name for fuzzy matching ──
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[–—:|\-"""″′''«»\u2019\u2018\u201C\u201D\u2033\u2032]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Main ──
async function main() {
  console.log("Scraping product prices from netereka.com...\n");
  const allProducts: Array<{ name: string; price: number }> = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = `${BASE_URL}${page}`;
    try {
      const html = await fetchPage(url);
      const products = extractProducts(html);
      allProducts.push(...products);
      console.log(
        `  Page ${String(page).padStart(2, "0")}/${TOTAL_PAGES}: ${products.length} products`
      );
    } catch (e) {
      console.error(
        `  Page ${page} FAILED: ${e instanceof Error ? e.message : e}`
      );
    }
    // Polite delay between requests
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nTotal scraped: ${allProducts.length} products`);

  // Build price lookup: normalized name → price
  const priceMap = new Map<string, number>();
  for (const p of allProducts) {
    if (p.price > 0) {
      priceMap.set(normalize(p.name), p.price);
    }
  }
  console.log(`Products with price: ${priceMap.size}\n`);

  // Read markdown
  const md = fs.readFileSync(MD_FILE, "utf-8");
  const lines = md.split("\n");
  const newLines: string[] = [];
  let updated = 0;
  let notFound = 0;

  for (const line of lines) {
    // Detect table header
    if (
      line.startsWith("|") &&
      line.includes("Nom") &&
      line.includes("Catégorie") &&
      line.includes("URL Image")
    ) {
      // Add Prix column if not present
      if (!line.includes("Prix")) {
        newLines.push("| Nom | Catégorie | Prix (CFA) | URL Image |");
      } else {
        newLines.push(line);
      }
      continue;
    }

    // Detect separator row
    if (line.startsWith("|") && /^\|[\s-|]+\|$/.test(line.trim())) {
      if (!line.includes("Prix")) {
        newLines.push("|-----|-----------|------------|-----------|");
      } else {
        newLines.push(line);
      }
      continue;
    }

    // Not a table data row → keep as-is
    if (
      !line.startsWith("|") ||
      line.includes("---") ||
      line.trim().length === 0
    ) {
      newLines.push(line);
      continue;
    }

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 3) {
      newLines.push(line);
      continue;
    }

    const name = cells[0];
    const category = cells[1];
    const imageUrl = cells[cells.length - 1]; // last cell is always image URL

    // 1) Exact normalized match
    const normName = normalize(name);
    let price = priceMap.get(normName);

    // 2) startsWith match (WP name may be longer due to SEO suffixes)
    if (price === undefined) {
      for (const [wpNorm, wpPrice] of priceMap) {
        if (wpNorm.startsWith(normName) || normName.startsWith(wpNorm)) {
          price = wpPrice;
          break;
        }
      }
    }

    // 3) Includes match (for short product names like "Pixel 6")
    if (price === undefined) {
      for (const [wpNorm, wpPrice] of priceMap) {
        // Require at least 8 chars to avoid false positives
        if (normName.length >= 8 && wpNorm.includes(normName)) {
          price = wpPrice;
          break;
        }
      }
    }

    if (price !== undefined && price > 0) {
      newLines.push(`| ${name} | ${category} | ${price} | ${imageUrl} |`);
      updated++;
    } else {
      newLines.push(`| ${name} | ${category} | 0 | ${imageUrl} |`);
      notFound++;
      console.log(`  No price: ${name}`);
    }
  }

  // Update total count in header
  const output = newLines.join("\n");
  fs.writeFileSync(MD_FILE, output, "utf-8");

  console.log(`\nDone!`);
  console.log(`  ${updated} products updated with prices`);
  console.log(`  ${notFound} products without price (set to 0)`);
}

main().catch(console.error);
