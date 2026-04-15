#!/usr/bin/env bash
set -euo pipefail

# Interactive rollback wrapper.
# Lists the 10 most recent Cloudflare Worker versions, prompts for a version ID,
# and executes wrangler rollback.
#
# Usage: npm run rollback

echo "🔄 Fetching recent versions..."
npx wrangler versions list --json \
  | jq -r '.[0:10] | map([.id, (.annotations."workers/triggered_by" // "unknown"), (.annotations."workers/tag" // "-"), .created_on] | @tsv) | .[]' \
  | awk -F'\t' 'BEGIN { printf "%-38s %-12s %-20s %s\n", "VERSION ID", "TRIGGER", "TAG", "CREATED"; printf "%-38s %-12s %-20s %s\n", "----------", "-------", "---", "-------" } { printf "%-38s %-12s %-20s %s\n", $1, $2, $3, $4 }'

echo ""
read -r -p "Enter version ID to rollback to: " VERSION_ID
if [ -z "$VERSION_ID" ]; then
  echo "❌ No version ID provided. Aborting."
  exit 1
fi

read -r -p "Reason for rollback (required): " REASON
if [ -z "$REASON" ]; then
  echo "❌ Reason required. Aborting."
  exit 1
fi

read -r -p "⚠  Confirm rollback to $VERSION_ID? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

npx wrangler rollback --version-id "$VERSION_ID" --message "Local rollback: $REASON"
echo "✅ Rollback executed. Remember to open a GitHub issue documenting the incident."
