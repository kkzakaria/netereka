// Removes noisy "env.IMAGES binding is not defined" warnings from OpenNext's
// image handler. The IMAGES binding is intentionally absent — images fall back
// to serving the original file, which is the correct behaviour for this project.
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(
  __dirname,
  "../node_modules/@opennextjs/cloudflare/dist/cli/templates/images.js"
);

let src = fs.readFileSync(file, "utf8");
const before = src;

src = src.replace(/\s*warn\("env\.IMAGES binding is not defined"\);\n/g, "\n");

if (src !== before) {
  fs.writeFileSync(file, src);
  console.log("✓ Patched @opennextjs/cloudflare: removed env.IMAGES warnings");
} else {
  console.log("✓ @opennextjs/cloudflare already patched");
}
