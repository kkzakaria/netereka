#!/usr/bin/env bash
set -euo pipefail

# Interactive promote wrapper.
# Shows currently-deployed versions with their traffic split, then promotes
# a chosen version to 100%.
#
# Usage: npm run promote

echo "🚀 Current deployed versions (and traffic split)..."
npx wrangler deployments list --json \
  | jq -r '.[0].versions[] | [.version_id, (.percentage // 0 | tostring + "%"), .annotations."workers/tag" // "-"] | @tsv' \
  | awk -F'\t' 'BEGIN { printf "%-38s %-8s %s\n", "VERSION ID", "TRAFFIC", "TAG"; printf "%-38s %-8s %s\n", "----------", "-------", "---" } { printf "%-38s %-8s %s\n", $1, $2, $3 }'

echo ""
echo "📋 Recent uploaded versions (may include non-deployed)..."
npx wrangler versions list --json \
  | jq -r '.[0:5] | map([.id, .annotations."workers/tag" // "-", .created_on] | @tsv) | .[]' \
  | awk -F'\t' 'BEGIN { printf "%-38s %-20s %s\n", "VERSION ID", "TAG", "CREATED" } { printf "%-38s %-20s %s\n", $1, $2, $3 }'

echo ""
read -r -p "Enter version ID to promote to 100%: " VERSION_ID
if [ -z "$VERSION_ID" ]; then
  echo "❌ No version ID provided. Aborting."
  exit 1
fi

read -r -p "⚠  Confirm promote $VERSION_ID to 100%? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

npx wrangler versions deploy "${VERSION_ID}@100%" --yes

echo ""
echo "🎨 Seeding hero LCP preload KV..."
node scripts/seed-hero-preload.js

echo "✅ Promotion complete."
