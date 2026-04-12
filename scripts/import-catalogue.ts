/**
 * Import NETEREKA catalogue from Excel to SQL seed file.
 * Usage (currently disabled): npx tsx scripts/import-catalogue.ts
 *
 * Previously read NETEREKA_Catalogue_Produits.xlsx and generated db/seeds/catalogue.sql.
 * Also downloaded product images to scripts/images/ for R2 upload.
 *
 * TEMPORARILY DISABLED: xlsx dependency removed because security fixes
 * (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) are only available via
 * cdn.sheetjs.com, not npm. Re-enable by installing a patched version from
 * the CDN, or migrate to an alternative library (e.g. exceljs).
 */

function main(): never {
  throw new Error(
    "import-catalogue is temporarily disabled: xlsx dependency was removed because npm has no patched version. " +
      "See https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 and https://github.com/advisories/GHSA-5pgg-2g8v-p4x9"
  );
}

main();
