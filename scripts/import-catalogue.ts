/**
 * Import NETEREKA catalogue from Excel to SQL seed file.
 * Usage: npx tsx scripts/import-catalogue.ts
 *
 * Reads NETEREKA_Catalogue_Produits.xlsx and generates db/seeds/catalogue.sql
 * Also downloads product images to scripts/images/ for R2 upload.
 */

import * as XLSX from "xlsx";
import { nanoid } from "nanoid";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";

const EXCEL_FILE = path.resolve(__dirname, "../NETEREKA_Catalogue_Produits.xlsx");
const OUTPUT_SQL = path.resolve(__dirname, "../db/seeds/catalogue.sql");
const IMAGES_DIR = path.resolve(__dirname, "images");

interface ExcelRow {
  "Nom du produit": string;
  Catégorie: string;
  Couleur: string;
  "Stockage/Capacité": string;
  "Prix (CFA)": number;
  "URL Image": string;
}

interface ProductGroup {
  name: string;
  category: string;
  brand: string;
  imageUrl: string;
  rows: ExcelRow[];
}

// ── Category mapping ──
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
];

const CATEGORY_MAP: Record<string, string> = {};
CATEGORIES.forEach((c) => {
  CATEGORY_MAP[c.name] = c.id;
});

// ── Brand extraction ──
// Brand names referenced by extractBrand() regex patterns below
// kept as documentation, not used programmatically

function extractBrand(name: string): string {
  // Check for Apple products by name patterns
  if (/^(iPhone|iPad|MacBook|AirPods|Apple Watch|Apple TV|Apple)/i.test(name)) return "Apple";
  if (/^Galaxy|^Samsung/i.test(name)) return "Samsung";
  if (/^Pixel|^Google/i.test(name)) return "Google";
  if (/^Huawei|^HUAWEI/i.test(name)) return "Huawei";
  if (/^Xiaomi|^Redmi|^Mi /i.test(name)) return "Xiaomi";
  if (/^OnePlus/i.test(name)) return "OnePlus";
  if (/^Sony|^PlayStation|^PS5/i.test(name)) return "Sony";
  if (/^JBL/i.test(name)) return "JBL";
  if (/^Bose/i.test(name)) return "Bose";
  if (/^Marshall/i.test(name)) return "Marshall";
  if (/^Beats/i.test(name)) return "Beats";
  if (/^Nothing/i.test(name)) return "Nothing";
  if (/^HP /i.test(name)) return "HP";
  if (/^Dell/i.test(name)) return "Dell";
  if (/^Lenovo/i.test(name)) return "Lenovo";
  if (/^Asus|^ASUS|^ROG/i.test(name)) return "Asus";
  if (/^Acer/i.test(name)) return "Acer";
  if (/^Microsoft|^Surface|^Xbox/i.test(name)) return "Microsoft";
  if (/^LG /i.test(name)) return "LG";
  if (/^TCL/i.test(name)) return "TCL";
  if (/^Hisense/i.test(name)) return "Hisense";
  if (/^Nintendo|^Switch/i.test(name)) return "Nintendo";
  if (/^Meta|^Quest/i.test(name)) return "Meta";
  if (/^Garmin/i.test(name)) return "Garmin";
  if (/^Amazfit/i.test(name)) return "Amazfit";
  if (/^Anker/i.test(name)) return "Anker";
  if (/^BenQ/i.test(name)) return "BenQ";
  if (/^Epson/i.test(name)) return "Epson";
  if (/^XGIMI/i.test(name)) return "XGIMI";
  if (/^Nebula/i.test(name)) return "Anker";
  if (/^Oppo|^OPPO/i.test(name)) return "Oppo";

  // Fallback: first word
  const first = name.split(" ")[0];
  return first;
}

// ── Product name normalization (merge variants into single products) ──
const PRODUCT_MERGE_RULES: Array<{ pattern: RegExp; baseName: string }> = [
  { pattern: /^Huawei Watch 5(\s+\(.*\))?$/, baseName: "Huawei Watch 5" },
  { pattern: /^(Apple Watch Ultra 2|WATCH Ultra 2)(\s+\(.*\))?$/, baseName: "Apple Watch Ultra 2" },
  { pattern: /^Apple Watch Series 10(\s+\(.*\))?$/, baseName: "Apple Watch Series 10" },
  { pattern: /^Huawei Mate XT\s+(1TB|512GB)$/, baseName: "Huawei Mate XT" },
  { pattern: /^Huawei Watch D2(\s+montre connectée santé)?$/, baseName: "Huawei Watch D2" },
  { pattern: /^Samsung Watch 8(\s+Classic 44mm)?$/, baseName: "Samsung Watch 8" },
];

function normalizeProductName(name: string): string {
  for (const rule of PRODUCT_MERGE_RULES) {
    if (rule.pattern.test(name)) return rule.baseName;
  }
  return name;
}

function extractVariantInfoFromName(originalName: string, normalizedName: string): Record<string, string> {
  const suffix = originalName.replace(normalizedName, "").trim();
  if (!suffix) return {};
  // Extract parenthesized info like (Silver), (Milanese band)
  const parenMatch = suffix.match(/\(([^)]+)\)/);
  if (parenMatch) return { style: parenMatch[1] };
  // Storage suffix like 1TB, 512GB
  if (/^\d+[TG]B$/i.test(suffix)) return { storage: suffix };
  // Other suffixes like "Classic 44mm"
  if (suffix) return { style: suffix };
  return {};
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

// ── Download helper ──
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      resolve();
      return;
    }
    const proto = url.startsWith("https") ? https : http;
    const request = proto.get(url, (response) => {
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

async function main() {
  // ── Parse Excel ──
  console.log("Parsing Excel...");
  const wb = XLSX.readFile(EXCEL_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws);
  console.log(`  ${rows.length} rows found`);

  // ── Group by product (with merge rules for variants encoded in names) ──
  const productMap = new Map<string, ProductGroup>();
  for (const row of rows) {
    const originalName = row["Nom du produit"].trim();
    const name = normalizeProductName(originalName);
    if (!productMap.has(name)) {
      productMap.set(name, {
        name,
        category: row["Catégorie"],
        brand: extractBrand(name),
        imageUrl: row["URL Image"],
        rows: [],
      });
    }
    // Inject extra variant info from the original name suffix
    const extraAttrs = extractVariantInfoFromName(originalName, name);
    if (extraAttrs.style && !row["Couleur"]) {
      row["Couleur"] = extraAttrs.style;
    }
    if (extraAttrs.storage && !row["Stockage/Capacité"]) {
      row["Stockage/Capacité"] = extraAttrs.storage;
    }
    productMap.get(name)!.rows.push(row);
  }
  console.log(`  ${productMap.size} unique products`);

  // ── Download images with SEO-friendly names ──
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  // Map: product name → { slug, ext, downloaded }
  const productImageMap = new Map<string, { filename: string; downloaded: boolean }>();
  console.log(`Downloading images for ${productMap.size} products...`);

  let downloaded = 0;
  for (const [productName, group] of productMap) {
    const productSlug = slugify(productName);
    const ext = path.extname(new URL(group.imageUrl).pathname) || ".webp";
    const filename = `${productSlug}${ext}`;
    const dest = path.join(IMAGES_DIR, filename);
    let ok = false;
    try {
      await downloadFile(group.imageUrl, dest);
      ok = true;
      downloaded++;
      if (downloaded % 20 === 0) console.log(`  ${downloaded}/${productMap.size}`);
    } catch (e: unknown) {
      console.warn(`  Failed: ${productName} - ${e instanceof Error ? e.message : e}`);
    }
    productImageMap.set(productName, { filename, downloaded: ok });
  }
  console.log(`  ${downloaded} images downloaded`);

  // ── Generate SQL ──
  console.log("Generating SQL...");
  const lines: string[] = [];
  lines.push("-- NETEREKA Product Catalogue (auto-generated)");
  lines.push("-- DO NOT EDIT MANUALLY - regenerate with: npx tsx scripts/import-catalogue.ts");
  lines.push("");

  lines.push("BEGIN TRANSACTION;");
  lines.push("");
  // Delete existing data (reverse dependency order)
  lines.push("DELETE FROM product_images;");
  lines.push("DELETE FROM product_variants;");
  lines.push("DELETE FROM product_attributes;");
  lines.push("DELETE FROM products;");
  lines.push("DELETE FROM categories;");
  lines.push("");

  // Categories
  lines.push("-- Categories");
  for (const cat of CATEGORIES) {
    lines.push(
      `INSERT INTO categories (id, name, slug, description, sort_order) VALUES ('${cat.id}', '${escapeSQL(cat.name)}', '${cat.slug}', '${escapeSQL(cat.description)}', ${cat.sort});`
    );
  }
  lines.push("");

  // Products, variants, images
  lines.push("-- Products");
  let productCount = 0;
  let variantCount = 0;
  let imageCount = 0;

  for (const [productName, group] of productMap) {
    const catId = CATEGORY_MAP[group.category];
    if (!catId) {
      console.warn(`  Unknown category: ${group.category} for ${productName}`);
      continue;
    }

    const baseSlug = slugify(productName);
    const slug = `${baseSlug}-${nanoid(6)}`;
    const productId = `prod_${nanoid(10)}`;
    const brand = group.brand;

    // Base price = minimum across all variants
    const prices = group.rows.map((r) => r["Prix (CFA)"]);
    const basePrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const comparePrice = maxPrice > basePrice ? maxPrice : null;

    // SKU from brand + nanoid for uniqueness
    const skuPrefix = brand.substring(0, 4).toUpperCase() + "-" + nanoid(6).toUpperCase();

    // Determine if featured (first 20 products get featured)
    const isFeatured = productCount < 20 ? 1 : 0;

    // Total stock = sum of variant stocks (random 5-30 per variant)
    const totalStock = group.rows.length * 10;

    lines.push(
      `INSERT INTO products (id, category_id, name, slug, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity) VALUES ('${productId}', '${catId}', '${escapeSQL(productName)}', '${slug}', ${basePrice}, ${comparePrice ?? "NULL"}, '${escapeSQL(skuPrefix)}', '${escapeSQL(brand)}', 1, ${isFeatured}, ${totalStock});`
    );
    productCount++;

    // Image
    const imgInfo = productImageMap.get(productName);
    const imgFilename = imgInfo?.filename || `${baseSlug}.webp`;
    const r2Path = `products/${slugify(group.category)}/${imgFilename}`;
    const imgId = `img_${nanoid(10)}`;
    lines.push(
      `INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary) VALUES ('${imgId}', '${productId}', '${r2Path}', '${escapeSQL(productName)}', 0, 1);`
    );
    imageCount++;

    // Variants
    const seenVariants = new Set<string>();
    for (const row of group.rows) {
      const color = row["Couleur"]?.trim() || "";
      const storage = row["Stockage/Capacité"]?.trim() || "";
      const variantKey = `${color}|${storage}`;
      if (seenVariants.has(variantKey)) continue;
      seenVariants.add(variantKey);

      const variantId = `var_${nanoid(10)}`;
      const variantName = [color, storage].filter(Boolean).join(" - ");
      const variantSku = `${skuPrefix}-${nanoid(4)}`.toUpperCase();
      const price = row["Prix (CFA)"];
      const attributes: Record<string, string> = {};
      if (color) attributes.color = color;
      if (storage) attributes.storage = storage;

      lines.push(
        `INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity, attributes) VALUES ('${variantId}', '${productId}', '${escapeSQL(variantName)}', '${escapeSQL(variantSku)}', ${price}, 10, '${escapeSQL(JSON.stringify(attributes))}');`
      );
      variantCount++;
    }
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");

  // Write SQL
  fs.writeFileSync(OUTPUT_SQL, lines.join("\n"), "utf-8");
  console.log(`Generated ${OUTPUT_SQL}`);
  console.log(`  ${productCount} products, ${variantCount} variants, ${imageCount} images`);

  // Write image upload script
  const uploadScript = path.resolve(__dirname, "upload-to-r2.sh");
  const uploadLines = ["#!/bin/bash", "# Upload images to R2", "# Usage: bash scripts/upload-to-r2.sh", ""];
  for (const [productName, group] of productMap) {
    const imgInfo = productImageMap.get(productName);
    if (!imgInfo?.downloaded) continue;
    const r2Path = `products/${slugify(group.category)}/${imgInfo.filename}`;
    const localPath = path.join("scripts/images", imgInfo.filename);
    const ext = path.extname(imgInfo.filename).toLowerCase();
    const mimeTypes: Record<string, string> = { ".webp": "image/webp", ".avif": "image/avif", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
    const contentType = mimeTypes[ext] || "image/webp";
    uploadLines.push(`npx wrangler r2 object put --remote netereka/${r2Path} --file=${localPath} --content-type=${contentType}`);
  }
  fs.writeFileSync(uploadScript, uploadLines.join("\n"), "utf-8");
  console.log(`Generated ${uploadScript}`);
}

main().catch(console.error);
