// Removes noisy "env.IMAGES binding is not defined" warnings from OpenNext's
// image handler. The IMAGES binding is intentionally absent — images fall back
// to serving the original file, which is the correct behaviour for this project.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const file = join(
  __dirname,
  "../node_modules/@opennextjs/cloudflare/dist/cli/templates/images.js"
);

const before = readFileSync(file, "utf8");
const after = before.replace(/\s*warn\("env\.IMAGES binding is not defined"\);\n/g, "\n");

if (after !== before) {
  writeFileSync(file, after);
  console.log("✓ Patched @opennextjs/cloudflare: removed env.IMAGES warnings");
} else {
  console.log("✓ @opennextjs/cloudflare already patched");
}
