#!/usr/bin/env node
/**
 * Ensure the "Workers version affinity" Transform Rule exists on the zone.
 *
 * Why: deploy.yml runs every merge as a 10/90 canary. Cloudflare routes each
 * request to a version at random, so a browser can get HTML from version A and
 * then request a content-hashed chunk (/_next/static/chunks/<hash>.js) from
 * version B, which 404s -> "Failed to load chunk ... from module N" (see the
 * 2026-09-11 incident: canary sha-dfba7fe left unpromoted for 8 days).
 *
 * Setting the `Cloudflare-Workers-Version-Key` request header makes routing
 * deterministic per key. We key on the client IP so anonymous visitors are
 * covered too. Docs: https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/
 *
 * Idempotent: creates the rule if missing, updates it if it drifted, no-op otherwise.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=<token> node scripts/version-affinity.mjs [--zone netereka.ci] [--dry-run]
 *
 * Token permissions: Zone → Zone → Read, Zone → Transform Rules → Edit (on the zone).
 */

const API = "https://api.cloudflare.com/client/v4";
const PHASE = "http_request_late_transform";
const HEADER = "Cloudflare-Workers-Version-Key";
const DESCRIPTION = "Workers version affinity (canary skew protection)";
const DESIRED = {
  description: DESCRIPTION,
  expression: "true",
  action: "rewrite",
  enabled: true,
  action_parameters: {
    headers: { [HEADER]: { operation: "set", expression: "ip.src" } },
  },
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const zoneIdx = args.indexOf("--zone");
const zoneName = zoneIdx !== -1 ? args[zoneIdx + 1] : "netereka.ci";
const token = process.env.CLOUDFLARE_API_TOKEN;

if (!token) {
  console.error("CLOUDFLARE_API_TOKEN is required (Zone:Read + Transform Rules:Edit).");
  process.exit(1);
}

async function cf(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

function ruleMatches(rule) {
  const h = rule.action_parameters?.headers?.[HEADER];
  return (
    rule.enabled === true &&
    rule.action === "rewrite" &&
    rule.expression === DESIRED.expression &&
    h?.operation === "set" &&
    h?.expression === DESIRED.action_parameters.headers[HEADER].expression
  );
}

const zones = await cf("GET", `/zones?name=${encodeURIComponent(zoneName)}`);
if (zones.length !== 1) {
  console.error(`Zone "${zoneName}" not found (or ambiguous).`);
  process.exit(1);
}
const zoneId = zones[0].id;

// The phase entrypoint 404s until the first rule is created on the zone.
let entrypoint = null;
try {
  entrypoint = await cf("GET", `/zones/${zoneId}/rulesets/phases/${PHASE}/entrypoint`);
} catch (err) {
  // 10003 "could not find entrypoint ruleset in the ... phase" (10001 on older API responses).
  if (!/"code":1000[13]/.test(String(err.message))) throw err;
}

const existing = entrypoint?.rules?.find(
  (r) => r.description === DESCRIPTION || r.action_parameters?.headers?.[HEADER],
);

if (existing && ruleMatches(existing)) {
  console.log(`OK: rule already present and up to date (rule ${existing.id}).`);
  process.exit(0);
}

if (dryRun) {
  console.log(existing ? `DRY RUN: would update rule ${existing.id}` : "DRY RUN: would create rule");
  console.log(JSON.stringify(DESIRED, null, 2));
  process.exit(0);
}

let result;
if (existing) {
  result = await cf("PATCH", `/zones/${zoneId}/rulesets/${entrypoint.id}/rules/${existing.id}`, DESIRED);
  console.log(`Updated rule ${existing.id} in ruleset ${result.id}.`);
} else if (entrypoint) {
  result = await cf("POST", `/zones/${zoneId}/rulesets/${entrypoint.id}/rules`, DESIRED);
  console.log(`Created rule in existing ruleset ${result.id}.`);
} else {
  result = await cf("POST", `/zones/${zoneId}/rulesets`, {
    name: "default",
    kind: "zone",
    phase: PHASE,
    rules: [DESIRED],
  });
  console.log(`Created ruleset ${result.id} with the rule.`);
}

const applied = result.rules.find((r) => r.description === DESCRIPTION);
if (!applied || !ruleMatches(applied)) {
  console.error("Rule applied but does not match desired state:", JSON.stringify(applied));
  process.exit(1);
}
console.log(`Verified: ${HEADER} = ip.src on all requests to ${zoneName} (rule ${applied.id}).`);
