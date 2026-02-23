import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function patch(file, transform, label) {
  const before = readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) {
    writeFileSync(file, after);
    console.log(`✓ Patched ${label}`);
  } else {
    console.log(`✓ ${label} already patched`);
  }
}

// 1. @opennextjs/cloudflare: remove "env.IMAGES binding is not defined" warnings.
//    The IMAGES binding is intentionally absent — images fall back to serving
//    the original file, which is the correct behaviour for this project.
patch(
  join(__dirname, "../node_modules/@opennextjs/cloudflare/dist/cli/templates/images.js"),
  (src) => src.replace(/\s*warn\("env\.IMAGES binding is not defined"\);\n/g, "\n"),
  "@opennextjs/cloudflare: removed env.IMAGES warnings"
);

// 2. kysely-d1: remove deprecated numUpdatedOrDeletedRows from QueryResult.
//    kysely-d1 v0.4.0 still sets this field for backward compatibility with
//    Kysely < 0.23. Kysely v0.28+ emits a warning whenever it detects it.
//    Both CJS and ESM bundles need the fix.
const kyselyD1Pattern =
  /\s*\/\/ @ts-ignore deprecated in kysely.*\n\s*numUpdatedOrDeletedRows:.*\n/g;

for (const bundle of ["index.js", "index.cjs"]) {
  patch(
    join(__dirname, `../node_modules/kysely-d1/dist/${bundle}`),
    (src) => src.replace(kyselyD1Pattern, "\n"),
    `kysely-d1/${bundle}: removed numUpdatedOrDeletedRows`
  );
}
