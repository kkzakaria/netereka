#!/usr/bin/env bash
set -euo pipefail

# Sync local D1 database from production (remote).
# Replaces local data with a fresh prod dump, then re-applies seed.sql
# to restore dev-only test accounts.
#
# Why the reorder step: wrangler exports data inline (INSERT right after each
# CREATE TABLE), so product_images INSERTs appear before the products CREATE
# TABLE. SQLite rejects this. We sort to: other (PRAGMA/DROP/etc) → CREATE → INSERT.
#
# Usage: bash scripts/sync-local-db.sh

DB_NAME="netereka-db"
LOCAL_D1_DIR=".wrangler/state/v3/d1/miniflare-D1DatabaseObject"
DUMP_FILE="$(mktemp /tmp/netereka-dump-XXXXXX.sql)"
SORTED_FILE="$(mktemp /tmp/netereka-dump-sorted-XXXXXX.sql)"

cleanup() {
  rm -f "$DUMP_FILE" "$SORTED_FILE"
}
trap cleanup EXIT

# ── 0. Pre-flight checks ─────────────────────────────────────────────────────
echo "==> [0/4] Checking credentials..."
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  # Check if wrangler has stored credentials (via wrangler login)
  if ! npx wrangler whoami &>/dev/null; then
    echo "ERROR: No Cloudflare credentials found."
    echo "  Run 'npx wrangler login' or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID."
    exit 1
  fi
fi
echo "    Credentials OK"

# ── 1. Export ────────────────────────────────────────────────────────────────
echo "==> [1/4] Exporting remote DB..."
npx wrangler d1 export "$DB_NAME" --remote --output="$DUMP_FILE"
echo "    Exported to $DUMP_FILE"

# Validate the dump is non-empty and looks like SQL
if [[ ! -s "$DUMP_FILE" ]]; then
  echo "ERROR: Dump file is empty. Aborting to protect local DB."
  exit 1
fi
if ! grep -q "CREATE TABLE" "$DUMP_FILE"; then
  echo "ERROR: Dump file contains no CREATE TABLE statements. Aborting to protect local DB."
  exit 1
fi

# ── 2. Reorder ───────────────────────────────────────────────────────────────
echo "==> [2/4] Reordering SQL (CREATE TABLE before INSERT)..."
node - "$DUMP_FILE" "$SORTED_FILE" <<'JSEOF'
const fs = require('fs');
const [,, input, output] = process.argv;
const content = fs.readFileSync(input, 'utf8');

const statements = content.split(/;[ \t]*\n/).map(s => s.trim()).filter(Boolean);

const creates = [], inserts = [], others = [];
for (const s of statements) {
  const upper = s.trimStart().toUpperCase();
  if (upper.startsWith('INSERT INTO SQLITE_SEQUENCE')) continue; // auto-managed by SQLite
  if (upper.startsWith('CREATE'))       creates.push(s + ';');
  else if (upper.startsWith('INSERT'))  inserts.push(s + ';');
  else                                   others.push(s + ';');
}

fs.writeFileSync(output, [...others, ...creates, ...inserts].join('\n') + '\n');
console.log(`    ${others.length} other, ${creates.length} CREATE, ${inserts.length} INSERT`);
JSEOF

# ── 3. Replace local DB ──────────────────────────────────────────────────────
echo "==> [3/4] Replacing local DB..."
if [[ -d "$LOCAL_D1_DIR" ]]; then
  find "$LOCAL_D1_DIR" -name "*.sqlite*" -delete
else
  echo "    Warning: local D1 dir not found at $LOCAL_D1_DIR (will be created on first run)"
fi
npx wrangler d1 execute "$DB_NAME" --local --file="$SORTED_FILE"

# ── 4. Re-apply seed (dev test accounts only) ────────────────────────────────
echo "==> [4/4] Re-applying seed (dev test accounts)..."
npx wrangler d1 execute "$DB_NAME" --local --file=db/seeds/seed.sql

echo ""
echo "✓  Local DB synced from production."
echo "   Test accounts (password: Test123!):"
echo "     admin@netereka.test  — role: admin"
echo "     client@test.com      — role: customer"
