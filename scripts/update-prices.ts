/**
 * Update netereka_produits.md prices from scraped data.
 * Usage: npx tsx scripts/update-prices.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const MD_FILE = path.resolve(__dirname, "../netereka_produits.md");

interface ScrapedProduct {
  name: string;
  price: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—:|\-"""″′''«»\u2019\u2018\u201C\u201D\u2033\u2032\u201E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Scraped prices (inline to avoid JSON encoding issues with special chars)
const SCRAPED: ScrapedProduct[] = [
  { name: "REDMI Note 15 Pro+ 5G", price: 215000 },
  { name: "Redmi Note 15", price: 110000 },
  { name: "Redmi Note 15 Pro", price: 145000 },
  { name: "HUAWEI NOVA 14I", price: 0 },
  { name: "Samsung Galaxy A17", price: 78000 },
  { name: "HONOR Magic 8 Pro", price: 750000 },
  { name: "Huawei Watch D2 : montre connectee sante", price: 280000 },
  { name: "Sony WH-1000XM5", price: 280000 },
  { name: "Console Sony PS5 Slim Edition Standard + EA SPORTS FC 26", price: 400000 },
  { name: "NBA 2K26 Switch 2", price: 38000 },
  { name: "Legendes Pokemon : Z-A", price: 48000 },
  { name: "The Legend of Zelda: Breath of the Wild", price: 45000 },
  { name: "EA SPORTS FC 26", price: 35000 },
  { name: "Battlefield 6 (PC)", price: 37000 },
  { name: "Samsung Fit 3 R390", price: 150000 },
  { name: "Oneplus 15 512Go", price: 700000 },
  { name: "XIAOMI 15 Ultra 1TB", price: 850000 },
  { name: "Honor Magic V5 16Go Ram 512Go", price: 1000000 },
  { name: "Google Pixel 10 Pro xl", price: 650000 },
  { name: "Google Pixel 10 Pro 512Go", price: 800000 },
  { name: "Samsung Z TRIFOLD", price: 3000000 },
  { name: "iPhone 17 Air", price: 650000 },
  { name: "iPhone 17 Pro Max", price: 950000 },
  { name: "iPhone 17 Pro", price: 880000 },
  { name: "Apple iPhone 17 5G", price: 630000 },
  { name: "REDMAGIC Nova Gaming", price: 500000 },
  { name: "OnePlus Buds Pro 3", price: 150000 },
  { name: "OnePlus Pad 3", price: 580000 },
  { name: "Samsung Watch 8 Classic 44mm", price: 400000 },
  { name: "Samsung Watch 8", price: 250000 },
  { name: "Galaxy Buds 3 Pro", price: 120000 },
  { name: "Galaxy Buds 3", price: 100000 },
  { name: "Galaxy Z Fold 7", price: 950000 },
  { name: "Redmagic 10S Pro", price: 600000 },
  { name: "OnePlus Nord 5", price: 500000 },
  { name: "OnePlus Nord CE4 Lite", price: 200000 },
  { name: "OnePlus 13S", price: 450000 },
  { name: "OnePlus 13R", price: 300000 },
  { name: "OnePlus 13", price: 530000 },
  { name: "Nothing Phone 3a", price: 350000 },
  { name: "Nothing Phone 2a", price: 370000 },
  { name: "Nothing Phone 2", price: 530000 },
  { name: "Huawei WiFi AX3", price: 50000 },
  { name: "Huawei WiFi BE3", price: 100000 },
  { name: "Huawei WiFi Mesh 3", price: 170000 },
  { name: "Huawei Watch D2", price: 270000 },
  { name: "Huawei Watch Fit 4 Pro", price: 180000 },
  { name: "Huawei Watch GT 5 Pro 46mm Multicolore", price: 300000 },
  { name: "Huawei Watch 4 Pro Space Edition", price: 380000 },
  { name: "Huawei Watch 5", price: 350000 },
  { name: "Huawei Watch 5 (Titanium)", price: 370000 },
  { name: "Huawei Watch 5 (Brown Composite)", price: 350000 },
  { name: "Huawei Watch 5 (Silver)", price: 400000 },
  { name: "Huawei Watch Ultimate", price: 470000 },
  { name: "Huawei FreeArc", price: 150000 },
  { name: "Huawei FreeClip", price: 150000 },
  { name: "FreeBuds 4 Pro", price: 150000 },
  { name: "FreeBuds 6i", price: 100000 },
  { name: "FreeBuds 6", price: 140000 },
  { name: "Huawei Mate XT 1TB", price: 2500000 },
  { name: "Huawei Mate XT 512GB", price: 2030000 },
  { name: "Huawei Mate X6", price: 880000 },
  { name: "Huawei Mate X3", price: 700000 },
  { name: "Huawei Pura 70 Ultra", price: 600000 },
  { name: "Huawei Pura 70 Pro", price: 480000 },
  { name: "Huawei Pura 70", price: 310000 },
  { name: "Huawei Nova 11 Pro", price: 480000 },
  { name: "Huawei Nova 12i", price: 150000 },
  { name: "Huawei Nova 12s", price: 185000 },
  { name: "Honor Magic V3", price: 850000 },
  { name: "Honor Magic V2", price: 650000 },
  { name: "Honor Magic 7 Pro", price: 630000 },
  { name: "Honor Magic 6 Pro", price: 520000 },
  { name: "Honor 400 Pro", price: 480000 },
  { name: "HONOR PAD 10", price: 300000 },
  { name: "Honor 200", price: 300000 },
  { name: "Honor 400 Lite", price: 210000 },
  { name: "Honor X9C", price: 210000 },
  { name: "Honor X7C", price: 140000 },
  { name: "Honor X7B", price: 130000 },
  { name: "IMPRIMANTE A RESERVOIRE Epson L8050", price: 255000 },
  { name: "IMPRIMANTE JET A RESERVOIR Epson L850", price: 360000 },
  { name: "IMPRIAMNTE JET A RESERVOIR EPSON L 18050", price: 500000 },
  { name: "IMPRIMANTE Canon Pixma G3430 WIFI", price: 85000 },
  { name: "LENOVO THINKBOOK", price: 585000 },
  { name: "LENOVO THINKBOOK 14 G6", price: 585000 },
  { name: "LENOVO THINKPAD E14 G5 CORE I7", price: 770000 },
  { name: "Lenovo ThinkPad E16", price: 650000 },
  { name: "Lenovo ThinkPad E15", price: 675000 },
  { name: "Lenovo Yoga 9 16 x360", price: 790000 },
  { name: "Dell Vostro 3520", price: 480000 },
  { name: "Ecran Philips 34 Incurve Gaming", price: 400000 },
  { name: "Ecran Lenovo 34 Incurve Gaming", price: 380000 },
  { name: "Ecran Lenovo 27 Incurve Gaming", price: 210000 },
  { name: "Ordinateur de Bureau Lenovo ThinkCentre Neo 50t", price: 315000 },
  { name: "Ordinateur de Bureau Dell Vostro 3030MT i7", price: 455000 },
  { name: "Ordinateur de Bureau Dell Vostro 3030MT i3", price: 300000 },
  { name: "BUREAU HP PRODESK 400 G9", price: 440000 },
  { name: "BUREAU HP 290-G9", price: 370000 },
  { name: "Otdinateur de Bureau HP 290 G9", price: 300000 },
  { name: "AirTag (pack of 1)", price: 30000 },
  { name: "AirTag (pack of 4)", price: 100000 },
  { name: "AirPods 4 ANC", price: 135000 },
  { name: "AirPods 4", price: 100000 },
  { name: "Apple Watch Ultra 2 (Milanese band)", price: 700000 },
  { name: "WATCH Ultra 2 (Titanium Natural)", price: 550000 },
  { name: "Apple Watch Ultra 2 (Titanium Black)", price: 550000 },
  { name: "Apple Watch Series 10 (Milanese)", price: 700000 },
  { name: "Apple Watch Series 10", price: 250000 },
  { name: "Apple Watch Series 9", price: 280000 },
  { name: "Apple Watch SE", price: 170000 },
  { name: "Apple TV 4K 128Gb (2025)", price: 190000 },
  { name: "Trackpad (White) (2025)", price: 180000 },
  { name: "Magic Mouse USB-C (White)", price: 120000 },
  { name: "Magic Mouse USB-C (Black)", price: 110000 },
  { name: "Magic Keyboard iMac (numeric Touch ID)", price: 220000 },
  { name: "Magic Keyboard iMac (qwerty)", price: 85000 },
  { name: "iMac M4 (2024)", price: 1450000 },
  { name: "iMac M3 (2024)", price: 1200000 },
  { name: "MacBook Pro M4 Max (2024)", price: 2200000 },
  { name: "MacBook Pro M4 Pro (2024)", price: 1350000 },
  { name: "MacBook Pro M4 (2024)", price: 1180000 },
  { name: "MacBook Pro M3 Max (2023)", price: 2500000 },
  { name: "MacBook Pro M3 (2023)", price: 1400000 },
  { name: "MacBook Pro (2023)", price: 1200000 },
  { name: "MacBook Pro M2 (2022)", price: 990000 },
  { name: "MacBook Air M3 (2023)", price: 950000 },
  { name: "MacBook Air M4 (2025)", price: 770000 },
  { name: "MacBook Air M2 (2024)", price: 630000 },
  { name: "MacBook Air M1 (2021)", price: 550000 },
  { name: "iPhone 16 Pro Max", price: 770000 },
  { name: "iPhone 16 Pro", price: 650000 },
  { name: "iPhone 16 Plus", price: 545000 },
  { name: "iPhone 16", price: 480000 },
  { name: "Xiaomi Smart Blender", price: 150000 },
  { name: "Xiaomi TV Stick", price: 38000 },
  { name: "Xiaomi TV Box 3", price: 55000 },
  { name: "Xiaomi TV A", price: 280000 },
  { name: "Xiaomi TV A Pro", price: 130000 },
  { name: "Mi In-Ear Headphones Basic", price: 15000 },
  { name: "Redmi Buds 6 Active", price: 25000 },
  { name: "Redmi Buds 6 Play", price: 25000 },
  { name: "Redmi Buds 6 Lite", price: 35000 },
  { name: "Redmi Buds 6", price: 45000 },
  { name: "Xiaomi Buds 5", price: 45000 },
  { name: "Redmi Buds 6 Pro", price: 60000 },
  { name: "Xiaomi Buds 5 Pro", price: 55000 },
  { name: "Xiaomi 67W HyperCharge Combo (Type-A) EU", price: 33000 },
  { name: "Xiaomi 45W Turbo Charging Power Adapter", price: 30000 },
  { name: "Redmi 18W Fast Charge Power Bank", price: 35000 },
  { name: "Xiaomi 33W Power Bank (Cable Integrated)", price: 35000 },
  { name: "Xiaomi 22.5W Power Bank", price: 35000 },
  { name: "Xiaomi 212W HyperCharge Power Bank", price: 45000 },
  { name: "Xiaomi Smart Laser Measure", price: 45000 },
  { name: "Mi Laser Projector 150", price: 1200000 },
  { name: "Xiaomi Smart Projector L1 Pro", price: 370000 },
  { name: "Xiaomi Smart Projector L1", price: 350000 },
  { name: "Mi Smart Projector 2", price: 310000 },
  { name: "Mi Wi-Fi Range Extender Pro", price: 35000 },
  { name: "Xiaomi WiFi Range Extender N300", price: 25000 },
  { name: "Mi WiFi Range Extender AC1200 GL", price: 30000 },
  { name: "Xiaomi Router AX1500", price: 45000 },
  { name: "Xiaomi Router AX3000T EU", price: 65000 },
  { name: "Xiaomi Router AX3200", price: 70000 },
  { name: "Xiaomi Router AC1200", price: 35000 },
  { name: "Xiaomi Smart Band 8 Pro", price: 80000 },
  { name: "Redmi Watch 3 Active", price: 45000 },
  { name: "Xiaomi Smart Band 9", price: 50000 },
  { name: "Xiaomi Smart Band 9 Active", price: 50000 },
  { name: "Xiaomi Smart Band 9 Pro", price: 70000 },
  { name: "Redmi Watch 5 Lite", price: 50000 },
  { name: "Redmi Watch 5 Active", price: 40000 },
  { name: "Redmi Pad Pro WIFI", price: 215000 },
  { name: "Redmi Pad Pro 5G", price: 250000 },
  { name: "Redmi Pad SE", price: 300000 },
  { name: "Redmi Pad SE 8.7", price: 145000 },
  { name: "Xiaomi Pad 7 Pro", price: 375000 },
  { name: "Xiaomi Pad 7", price: 285000 },
  { name: "Redmi Pad 2", price: 200000 },
  { name: "Redmi Pad 6S Pro", price: 470000 },
  { name: "Redmi Pad 2 4G", price: 200000 },
  { name: "Xiaomi 14T", price: 270000 },
  { name: "Redmi Note 14 Pro+", price: 185000 },
  { name: "Xiaomi 15 Ultra", price: 680000 },
  { name: "Xiaomi 15", price: 560000 },
  { name: "POCO F7 Pro", price: 380000 },
  { name: "POCO F7 Ultra", price: 510000 },
  { name: "Poco Pad", price: 260000 },
  { name: "POCO X7 Pro", price: 280000 },
  { name: "Redmi A5", price: 45000 },
  { name: "Samsung Tab S10 Ultra", price: 700000 },
  { name: "Samsung Tab S9 Ultra", price: 1030000 },
  { name: "Samsung Tab S9+", price: 680000 },
  { name: "Samsung Tab S9 FE+", price: 370000 },
  { name: "Samsung Tab S9 FE", price: 300000 },
  { name: "Samsung Tab S9", price: 400000 },
  { name: "Samsung Tab A9+", price: 145000 },
  { name: "Samsung Z Fold 6", price: 590000 },
  { name: "Samsung Z Fold 5", price: 630000 },
  { name: "Samsung Z Fold 4", price: 485000 },
  { name: "Samsung Z Fold 3", price: 475000 },
  { name: "Samsung Z Flip 6", price: 455000 },
  { name: "Samsung S25 Ultra", price: 550000 },
  { name: "Samsung S25+", price: 505000 },
  { name: "Samsung S25", price: 400000 },
  { name: "Samsung S24 Ultra", price: 495000 },
  { name: "Samsung S24+", price: 385000 },
  { name: "Samsung S24 FE", price: 380000 },
  { name: "Samsung S24", price: 340000 },
  { name: "Samsung S23+", price: 475000 },
  { name: "Samsung S23 FE 5G", price: 270000 },
  { name: "Samsung S23", price: 335000 },
  { name: "Samsung A06", price: 82500 },
  { name: "Samsung A16", price: 160000 },
  { name: "Samsung A26", price: 16000 },
  { name: "Samsung A36", price: 190000 },
  { name: "Samsung A56", price: 210000 },
  { name: "iPad Pro M4 2024", price: 100000 },
  { name: "iPad Air 7th M3 2025", price: 490000 },
  { name: "iPad Air 6th (M2, 2024)", price: 390000 },
  { name: "iPad mini 7 (2024)", price: 310000 },
  { name: "iPad mini 6 (2022)", price: 300000 },
  { name: "iPad 11th Gen (2025)", price: 310000 },
  { name: "Pixel 6", price: 280000 },
  { name: "Pixel 7", price: 335000 },
  { name: "Pixel 8", price: 400000 },
  { name: "Pixel 8 Pro", price: 450000 },
  { name: "Pixel 9", price: 420000 },
  { name: "iPad 10th Gen (2022)", price: 260000 },
  { name: "Redmi Watch 5", price: 80000 },
  { name: "Pixel 9 Pro", price: 300000 },
  { name: "Pixel 9 Pro XL", price: 300000 },
  { name: "Pixel 9 Pro Fold", price: 720000 },
  // New products found on site (not in original markdown)
  { name: "Huawei Watch GT 6 46 mm", price: 160000 },
  { name: "Huawei Watch GT 6 Pro 46 mm", price: 280000 },
  { name: "Huawei Watch GT 6 Pro Titanium 46mm", price: 300000 },
  { name: "Honor X9d 5G", price: 250000 },
  { name: "Lenovo ThinkPad E15 i7 16Go", price: 675000 },
];

function main() {
  const scraped = SCRAPED;
  console.log(`Loaded ${scraped.length} scraped products`);

  // Build price lookup: normalized name → price
  const priceMap = new Map<string, number>();
  for (const p of scraped) {
    priceMap.set(normalize(p.name), p.price);
  }

  // Read markdown
  const md = fs.readFileSync(MD_FILE, "utf-8");
  const lines = md.split("\n");
  const newLines: string[] = [];
  let updated = 0;
  let notFound = 0;

  for (const line of lines) {
    // Skip non-data rows
    if (
      !line.startsWith("| ") ||
      line.includes("---") ||
      line.includes("Nom")
    ) {
      newLines.push(line);
      continue;
    }

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4) {
      newLines.push(line);
      continue;
    }

    const name = cells[0];
    const category = cells[1];
    const imageUrl = cells[3];
    const normName = normalize(name);

    // 1) Exact normalized match
    let price = priceMap.get(normName);

    // 2) startsWith match (WP names may be longer with SEO suffixes)
    if (price === undefined) {
      for (const [wpNorm, wpPrice] of priceMap) {
        if (wpNorm.startsWith(normName) || normName.startsWith(wpNorm)) {
          price = wpPrice;
          break;
        }
      }
    }

    // 3) Partial includes match for short names (min 6 chars)
    if (price === undefined && normName.length >= 6) {
      for (const [wpNorm, wpPrice] of priceMap) {
        if (wpNorm.includes(normName)) {
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

  fs.writeFileSync(MD_FILE, newLines.join("\n"), "utf-8");
  console.log(`\nDone: ${updated} updated, ${notFound} without price`);
}

main();
