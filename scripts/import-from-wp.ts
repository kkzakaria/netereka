/**
 * Import NETEREKA products from WordPress product list (netereka_produits.md).
 * Downloads images and generates catalogue.sql + upload-to-r2.sh
 *
 * Usage: npx tsx scripts/import-from-wp.ts
 */

import { nanoid } from "nanoid";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";

const MD_FILE = path.resolve(__dirname, "../netereka_produits.md");
const OUTPUT_SQL = path.resolve(__dirname, "../db/seeds/catalogue.sql");
const IMAGES_DIR = path.resolve(__dirname, "images");

// ── Types ──
interface MdProduct {
  name: string;
  wpCategory: string;
  price: number;
  imageUrl: string;
}

interface ProductGroup {
  name: string;
  categoryId: string;
  brand: string;
  imageUrl: string;
  basePrice: number;
  variants: Array<{
    originalName: string;
    price: number;
    attrs: Record<string, string>;
    imageUrl: string;
  }>;
}

// ── Categories ──
const CATEGORIES = [
  { id: "cat_smartphones", name: "Smartphones", slug: "smartphones", description: "Téléphones portables et smartphones", sort: 1 },
  { id: "cat_ordinateurs", name: "Ordinateurs", slug: "ordinateurs", description: "Ordinateurs portables et de bureau", sort: 2 },
  { id: "cat_tablettes", name: "Tablettes", slug: "tablettes", description: "Tablettes tactiles", sort: 3 },
  { id: "cat_montres", name: "Montres connectées", slug: "montres-connectees", description: "Montres intelligentes et bracelets connectés", sort: 4 },
  { id: "cat_ecouteurs", name: "Écouteurs", slug: "ecouteurs", description: "Écouteurs, casques et audio", sort: 5 },
  { id: "cat_accessoires", name: "Accessoires", slug: "accessoires", description: "Accessoires électroniques", sort: 6 },
  { id: "cat_jeux", name: "Jeux", slug: "jeux", description: "Consoles et jeux vidéo", sort: 7 },
  { id: "cat_televiseurs", name: "Téléviseurs", slug: "televiseurs", description: "Télévisions et écrans", sort: 8 },
  { id: "cat_projecteurs", name: "Projecteurs", slug: "projecteurs", description: "Vidéoprojecteurs", sort: 9 },
  { id: "cat_imprimantes", name: "Imprimantes", slug: "imprimantes", description: "Imprimantes et scanners", sort: 10 },
  { id: "cat_reseau", name: "Réseau", slug: "reseau", description: "Routeurs et accessoires réseau", sort: 11 },
];

const CAT_SLUG_MAP = new Map<string, string>();
for (const c of CATEGORIES) CAT_SLUG_MAP.set(c.id, c.slug);

// WordPress category → local category ID
const WP_CATEGORY_MAP: Record<string, string> = {
  "Smartphones": "cat_smartphones",
  "Laptops Computers": "cat_ordinateurs",
  "Tablets": "cat_tablettes",
  "Smartwatches": "cat_montres",
  "Earbuds And In Ear": "cat_ecouteurs",
  "Accessories 2": "cat_accessoires",
  "Jeux": "cat_jeux",
  "Tvs": "cat_televiseurs",
  "Projectors": "cat_projecteurs",
  "Scanners": "cat_imprimantes",
  "Routers Extenders": "cat_reseau",
  "Powerbanks": "cat_accessoires",
  "Kitchen Devices": "cat_accessoires",
};

function inferCategory(name: string): string {
  if (/^(Redmi Note|Samsung Galaxy A|HONOR Magic \d|HUAWEI)/i.test(name)) return "cat_smartphones";
  if (/WH-|casque/i.test(name)) return "cat_ecouteurs";
  if (/NBA|Switch\s*2/i.test(name)) return "cat_jeux";
  return "cat_smartphones";
}

function resolveCategory(wpCat: string, name: string): string {
  if (wpCat === "Non catégorisé") return inferCategory(name);
  return WP_CATEGORY_MAP[wpCat] || "cat_accessoires";
}

// ── Brand extraction ──
function extractBrand(name: string): string {
  if (/^(iPhone|iPad|MacBook|AirPods|AirTag|Apple Watch|Apple TV|Apple|iMac|Trackpad|Magic)/i.test(name)) return "Apple";
  if (/^(Galaxy|Samsung)/i.test(name)) return "Samsung";
  if (/^(Pixel|Google)/i.test(name)) return "Google";
  if (/^(Huawei|HUAWEI|FreeBuds)/i.test(name)) return "Huawei";
  if (/^(Xiaomi|Redmi|Mi |POCO)/i.test(name)) return "Xiaomi";
  if (/^(OnePlus|Oneplus)/i.test(name)) return "OnePlus";
  if (/^(Sony|PlayStation|PS5|Console Sony)/i.test(name)) return "Sony";
  if (/^Nothing/i.test(name)) return "Nothing";
  if (/^(HP |BUREAU HP)/i.test(name)) return "HP";
  if (/^Dell/i.test(name)) return "Dell";
  if (/^(Lenovo|LENOVO)/i.test(name)) return "Lenovo";
  if (/^(Honor|HONOR)/i.test(name)) return "Honor";
  if (/^(REDMAGIC|Redmagic)/i.test(name)) return "RedMagic";
  if (/^WATCH Ultra/i.test(name)) return "Apple";
  if (/Epson/i.test(name)) return "Epson";
  if (/Canon/i.test(name)) return "Canon";
  if (/^Écran Philips|^Philips/i.test(name)) return "Philips";
  if (/^(Écran Lenovo|Ordinateur.*Lenovo)/i.test(name)) return "Lenovo";
  if (/^(Ordinateur.*Dell|Otdinateur.*Dell)/i.test(name)) return "Dell";
  if (/^(Ordinateur.*HP|Otdinateur.*HP)/i.test(name)) return "HP";
  if (/^NBA/i.test(name)) return "2K Games";
  if (/^(Légendes Pokémon|The Legend of Zelda)/i.test(name)) return "Nintendo";
  if (/^(EA SPORTS|Battlefield)/i.test(name)) return "EA";
  if (/^IMPRI/i.test(name)) {
    if (/Epson/i.test(name)) return "Epson";
    if (/Canon/i.test(name)) return "Canon";
  }
  return name.split(" ")[0];
}

// ── Merge rules (variant products that should be grouped) ──
const PRODUCT_MERGE_RULES: Array<{ pattern: RegExp; baseName: string }> = [
  { pattern: /^Huawei Watch 5(\s+\(.*\))?$/, baseName: "Huawei Watch 5" },
  { pattern: /^(Apple Watch Ultra 2|WATCH Ultra 2)(\s+\(.*\))?$/, baseName: "Apple Watch Ultra 2" },
  { pattern: /^Apple Watch Series 10(\s+\(.*\))?$/, baseName: "Apple Watch Series 10" },
  { pattern: /^Huawei Mate XT\s+(1TB|512GB)$/, baseName: "Huawei Mate XT" },
  { pattern: /^Huawei Watch D2(\s*:?\s*montre connectée santé)?$/, baseName: "Huawei Watch D2" },
  { pattern: /^Samsung Watch 8(\s+Classic 44mm)?$/, baseName: "Samsung Watch 8" },
];

function normalizeProductName(name: string): string {
  for (const rule of PRODUCT_MERGE_RULES) {
    if (rule.pattern.test(name)) return rule.baseName;
  }
  return name;
}

function extractVariantInfo(original: string, normalized: string): Record<string, string> {
  const suffix = original.replace(normalized, "").trim();
  if (!suffix) return {};
  const paren = suffix.match(/\(([^)]+)\)/);
  if (paren) return { style: paren[1] };
  if (/^\d+[TG]B$/i.test(suffix)) return { storage: suffix };
  if (/^Classic 44mm$/i.test(suffix)) return { style: "Classic 44mm" };
  if (/^:?\s*montre connectée santé$/i.test(suffix)) return {};
  if (suffix) return { style: suffix };
  return {};
}

// ── Helpers ──
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve(); return; }
    const proto = url.startsWith("https") ? https : http;
    const request = proto.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location!, dest).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    request.on("error", reject);
    request.setTimeout(15000, () => { request.destroy(); reject(new Error("timeout")); });
  });
}

// ── Parse markdown ──
function parseMarkdown(content: string): MdProduct[] {
  const products: MdProduct[] = [];
  for (const line of content.split("\n")) {
    if (!line.startsWith("| ") || line.includes("---") || line.includes("Nom")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    const [name, category, priceStr, imageUrl] = cells;
    products.push({
      name,
      wpCategory: category,
      price: parseInt(priceStr) || 0,
      imageUrl,
    });
  }
  return products;
}

// ── Main ──
async function main() {
  // 1. Parse markdown
  console.log("Parsing netereka_produits.md...");
  const mdContent = fs.readFileSync(MD_FILE, "utf-8");
  const mdProducts = parseMarkdown(mdContent);
  console.log(`  ${mdProducts.length} products found`);

  // 2. Group by normalized name (merge variants)
  const productMap = new Map<string, ProductGroup>();

  for (const mp of mdProducts) {
    const normalized = normalizeProductName(mp.name);
    const categoryId = resolveCategory(mp.wpCategory, mp.name);

    if (!productMap.has(normalized)) {
      productMap.set(normalized, {
        name: normalized,
        categoryId,
        brand: extractBrand(normalized),
        imageUrl: mp.imageUrl,
        basePrice: mp.price,
        variants: [],
      });
    }

    const group = productMap.get(normalized)!;
    const attrs = extractVariantInfo(mp.name, normalized);
    group.variants.push({
      originalName: mp.name,
      price: mp.price,
      attrs,
      imageUrl: mp.imageUrl,
    });

    // Update base price to minimum
    if (mp.price > 0 && (group.basePrice === 0 || mp.price < group.basePrice)) {
      group.basePrice = mp.price;
    }
  }

  console.log(`  ${productMap.size} unique products after merge`);

  // 3. Download images
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const imageMap = new Map<string, { filename: string; downloaded: boolean }>();
  console.log("\nDownloading images...");
  let dlCount = 0;
  let failCount = 0;

  for (const [prodName, group] of productMap) {
    const slug = slugify(prodName);
    let ext: string;
    try {
      ext = path.extname(new URL(group.imageUrl).pathname) || ".webp";
    } catch {
      ext = ".webp";
    }
    const filename = `${slug}${ext}`;
    const dest = path.join(IMAGES_DIR, filename);
    let ok = false;

    try {
      await downloadFile(group.imageUrl, dest);
      ok = true;
      dlCount++;
      if (dlCount % 30 === 0) console.log(`  ${dlCount}/${productMap.size}`);
    } catch (e: unknown) {
      failCount++;
      console.warn(`  FAIL: ${prodName} - ${e instanceof Error ? e.message : e}`);
    }

    imageMap.set(prodName, { filename, downloaded: ok });
  }

  console.log(`  ${dlCount} downloaded, ${failCount} failed`);

  // 4. Generate SQL
  console.log("\nGenerating SQL...");
  const lines: string[] = [];
  lines.push("-- NETEREKA Product Catalogue (auto-generated from WordPress)");
  lines.push("-- Generated with: npx tsx scripts/import-from-wp.ts");
  lines.push("");
  lines.push("PRAGMA foreign_keys = OFF;");
  lines.push("");
  lines.push("-- Clean existing data");
  lines.push("DELETE FROM order_items;");
  lines.push("DELETE FROM orders;");
  lines.push("DELETE FROM reviews;");
  lines.push("DELETE FROM wishlist;");
  lines.push("DELETE FROM product_images;");
  lines.push("DELETE FROM product_variants;");
  lines.push("DELETE FROM products;");
  lines.push("DELETE FROM categories;");
  lines.push("");
  lines.push("PRAGMA foreign_keys = ON;");
  lines.push("");

  // Categories
  lines.push("-- Categories");
  for (const cat of CATEGORIES) {
    lines.push(
      `INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('${cat.id}', '${escapeSQL(cat.name)}', '${cat.slug}', '${escapeSQL(cat.description)}', ${cat.sort});`
    );
  }
  lines.push("");

  // Products
  lines.push("-- Products");
  let pCount = 0;
  let vCount = 0;
  let iCount = 0;

  for (const [prodName, group] of productMap) {
    const baseSlug = slugify(prodName);
    const slug = `${baseSlug}-${nanoid(6)}`;
    const productId = `prod_${nanoid(10)}`;
    const skuPrefix = group.brand.substring(0, 4).toUpperCase() + "-" + nanoid(6).toUpperCase();
    const isFeatured = pCount < 20 ? 1 : 0;
    const catSlug = CAT_SLUG_MAP.get(group.categoryId) || "accessoires";

    // Prices
    const prices = group.variants.map((v) => v.price).filter((p) => p > 0);
    const basePrice = prices.length > 0 ? Math.min(...prices) : group.basePrice;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const comparePrice = maxPrice > basePrice ? maxPrice : null;

    // Stock = 10 per variant, min 10
    const stock = Math.max(group.variants.length * 10, 10);

    lines.push(
      `INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('${productId}', '${group.categoryId}', '${escapeSQL(prodName)}', '${slug}', ${basePrice}, ${comparePrice ?? "NULL"}, '${escapeSQL(skuPrefix)}', '${escapeSQL(group.brand)}', 1, ${isFeatured}, ${stock});`
    );
    pCount++;

    // Primary image
    const imgInfo = imageMap.get(prodName);
    const imgFilename = imgInfo?.filename || `${baseSlug}.webp`;
    const r2Path = `products/${catSlug}/${imgFilename}`;
    const imgId = `img_${nanoid(10)}`;
    lines.push(
      `INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('${imgId}', '${productId}', '${r2Path}', '${escapeSQL(prodName)}', 0, 1);`
    );
    iCount++;

    // Variants (only for merged products with multiple entries)
    if (group.variants.length > 1) {
      const seen = new Set<string>();
      for (const variant of group.variants) {
        const attrs = variant.attrs;
        if (Object.keys(attrs).length === 0) continue;
        const key = JSON.stringify(attrs);
        if (seen.has(key)) continue;
        seen.add(key);

        const variantId = `var_${nanoid(10)}`;
        const variantName = Object.values(attrs).join(" - ");
        const variantSku = `${skuPrefix}-${nanoid(4)}`.toUpperCase();

        lines.push(
          `INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('${variantId}', '${productId}', '${escapeSQL(variantName)}', '${escapeSQL(variantSku)}', ${variant.price}, 10, '${escapeSQL(JSON.stringify(attrs))}');`
        );
        vCount++;
      }
    }

    lines.push("");
  }

  // Write SQL
  fs.writeFileSync(OUTPUT_SQL, lines.join("\n"), "utf-8");
  console.log(`\nGenerated ${OUTPUT_SQL}`);
  console.log(`  ${pCount} products, ${vCount} variants, ${iCount} images`);

  // 5. Generate R2 upload script
  const uploadScript = path.resolve(__dirname, "upload-to-r2.sh");
  const uploadLines = [
    "#!/bin/bash",
    "# Upload product images to Cloudflare R2",
    "# Usage: bash scripts/upload-to-r2.sh",
    "",
    "set -e",
    "",
  ];

  for (const [prodName, group] of productMap) {
    const imgInfo = imageMap.get(prodName);
    if (!imgInfo?.downloaded) continue;
    const catSlug = CAT_SLUG_MAP.get(group.categoryId) || "accessoires";
    const r2Path = `products/${catSlug}/${imgInfo.filename}`;
    const localPath = `scripts/images/${imgInfo.filename}`;
    const ext = path.extname(imgInfo.filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".webp": "image/webp",
      ".avif": "image/avif",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = mimeTypes[ext] || "image/webp";
    uploadLines.push(
      `npx wrangler r2 object put --remote netereka/${r2Path} --file=${localPath} --content-type=${contentType}`
    );
  }

  fs.writeFileSync(uploadScript, uploadLines.join("\n"), "utf-8");
  console.log(`Generated ${uploadScript} (${uploadLines.length - 6} files)`);
}

main().catch(console.error);
