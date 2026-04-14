/**
 * Génère le clientSecret JWT pour Apple Sign In (better-auth).
 *
 * Usage:
 *   node scripts/generate-apple-secret.mjs \
 *     --key /path/to/AuthKey_XXXXXXXXXX.p8 \
 *     --team-id XXXXXXXXXX \
 *     --key-id XXXXXXXXXX \
 *     --client-id ci.netereka.web
 *
 * Le secret généré est valide 180 jours (max autorisé par Apple).
 * À régénérer avant expiration et re-déployer avec :
 *   npx wrangler secret put APPLE_CLIENT_SECRET
 */

import { readFileSync } from "fs";
import { createSign } from "crypto";

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    result[args[i].replace(/^--/, "")] = args[i + 1];
  }
  return result;
}

const { key, "team-id": teamId, "key-id": keyId, "client-id": clientId } = parseArgs();

if (!key || !teamId || !keyId || !clientId) {
  console.error("Usage: node scripts/generate-apple-secret.mjs --key <path.p8> --team-id <TEAM_ID> --key-id <KEY_ID> --client-id <SERVICE_ID>");
  process.exit(1);
}

const privateKey = readFileSync(key, "utf8");
const now = Math.floor(Date.now() / 1000);
const exp = now + 180 * 24 * 60 * 60; // 180 jours

const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now, exp, aud: "https://appleid.apple.com", sub: clientId })).toString("base64url");

const sign = createSign("SHA256");
sign.update(`${header}.${payload}`);
const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");

const jwt = `${header}.${payload}.${signature}`;

console.log("\nAPPLE_CLIENT_SECRET (valide jusqu'au", new Date(exp * 1000).toLocaleDateString("fr-FR"), "):\n");
console.log(jwt);
console.log("\nCommande wrangler :");
console.log(`echo '${jwt}' | npx wrangler secret put APPLE_CLIENT_SECRET`);
