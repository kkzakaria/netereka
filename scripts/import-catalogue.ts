/**
 * Import NETEREKA catalogue from Excel to SQL seed file.
 * Usage: npx tsx scripts/import-catalogue.ts
 *
 * Reads NETEREKA_Catalogue_Produits.xlsx and generates db/seeds/catalogue.sql
 * Also downloads product images to scripts/images/ for R2 upload.
 *
 * TEMPORARILY DISABLED: xlsx dependency removed due to unpatched vulnerabilities
 * (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). Re-enable when a fix is available
 * or migrate to an alternative library (e.g. exceljs, SheetJS Pro).
 */

throw new Error(
  "import-catalogue is temporarily disabled: xlsx dependency was removed due to unpatched security vulnerabilities. " +
    "See https://github.com/advisories/GHSA-4r6h-8v6p-xvw6"
);
