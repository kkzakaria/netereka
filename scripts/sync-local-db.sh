#!/usr/bin/env bash
set -euo pipefail

# Sync local D1 database from production (remote).
# Replaces local data with a fresh prod dump, then re-applies seed.sql
# to restore dev test accounts and all sample data (seed.sql seeds users,
# products, variants, images, orders, order_items, categories, delivery zones).
# Existing rows in the dump take precedence — conflicting seed rows are
# skipped silently via INSERT OR IGNORE.
#
# Why the reorder step: wrangler exports each table's DDL and DML together,
# ordered by schema declaration. This means CREATE TABLE product_images and
# its INSERT statements can appear in the dump before CREATE TABLE products.
# With foreign_keys=ON, inserting into product_images before products exists
# raises a FK violation. We reorder: other (PRAGMA/DROP/etc) → CREATE → INSERT,
# so all parent tables are defined before any child inserts run.
#
# NOTE: The SQL splitter uses /;[ \t]*\n/ as a statement boundary. This works
# for standard wrangler dumps but would break if a text column value contains
# a literal semicolon followed by a newline (e.g. a multi-line description).
# Current schema fields where this could occur: description, short_description,
# internal_notes, cancellation_reason. Treat this as a known limitation.
#
# Usage: npm run db:sync  (must be run from the project root)

DB_NAME="netereka-db"
LOCAL_D1_DIR=".wrangler/state/v3/d1/miniflare-D1DatabaseObject"
DUMP_FILE="$(mktemp /tmp/netereka-dump-XXXXXX.sql)"
SORTED_FILE="$(mktemp /tmp/netereka-dump-sorted-XXXXXX.sql)"
BACKUP_DIR="$(mktemp -d /tmp/netereka-db-backup-XXXXXX)"

cleanup() {
  rm -f "$DUMP_FILE" "$SORTED_FILE"
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

# ── 0. Pre-flight checks ─────────────────────────────────────────────────────
echo "==> [0/5] Checking prerequisites..."

# Validate we are at the project root (seed path is relative)
if [[ ! -f "db/seeds/seed.sql" ]]; then
  echo "ERROR: db/seeds/seed.sql not found."
  echo "  Run this script from the project root: cd $(git rev-parse --show-toplevel 2>/dev/null || echo '<project-root>')"
  exit 1
fi

# Check Cloudflare credentials.
# If neither env var is set, fall back to checking for a stored wrangler login session.
# Both vars must be set together — setting only one is not enough for API token auth.
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is set but CLOUDFLARE_ACCOUNT_ID is missing."
  echo "  Both must be set together for API token authentication."
  exit 1
fi
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_ACCOUNT_ID is set but CLOUDFLARE_API_TOKEN is missing."
  echo "  Both must be set together for API token authentication."
  exit 1
fi
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  WHOAMI_ERROR="$(npx wrangler whoami 2>&1 >/dev/null)" || {
    echo "ERROR: No Cloudflare credentials found."
    echo "  Option 1: npx wrangler login"
    echo "  Option 2: set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID"
    [[ -n "$WHOAMI_ERROR" ]] && echo "  Wrangler: $WHOAMI_ERROR"
    exit 1
  }
fi
echo "    Prerequisites OK"

# ── 1. Export ────────────────────────────────────────────────────────────────
echo "==> [1/5] Exporting remote DB..."
npx wrangler d1 export "$DB_NAME" --remote --output="$DUMP_FILE"
echo "    Exported to $DUMP_FILE"

# Validate the dump before touching the local DB
if [[ ! -s "$DUMP_FILE" ]]; then
  echo "ERROR: Dump file is empty. Aborting to protect local DB."
  exit 1
fi
if ! grep -q "CREATE TABLE" "$DUMP_FILE"; then
  echo "ERROR: Dump file contains no CREATE TABLE statements. Aborting to protect local DB."
  exit 1
fi

# ── 2. Reorder ───────────────────────────────────────────────────────────────
echo "==> [2/5] Reordering SQL (CREATE TABLE before INSERT)..."
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

# Validate reorder output before we delete anything
if [[ ! -s "$SORTED_FILE" ]]; then
  echo "ERROR: Reorder step produced an empty file. Aborting to protect local DB."
  exit 1
fi
if ! grep -q "CREATE TABLE" "$SORTED_FILE"; then
  echo "ERROR: Reorder output contains no CREATE TABLE statements. Aborting to protect local DB."
  exit 1
fi

# ── 3. Back up and replace local DB ──────────────────────────────────────────
echo "==> [3/5] Replacing local DB..."
if [[ -d "$LOCAL_D1_DIR" ]]; then
  # Back up existing sqlite files so we can restore on import failure.
  # Only attempt copy if files actually exist; fail explicitly if cp errors
  # (e.g. disk full) to avoid silently losing the only copy of local data.
  SQLITE_FILES=()
  while IFS= read -r -d '' f; do
    SQLITE_FILES+=("$f")
  done < <(find "$LOCAL_D1_DIR" -name "*.sqlite*" -print0 2>/dev/null)
  if [[ ${#SQLITE_FILES[@]} -gt 0 ]]; then
    cp "${SQLITE_FILES[@]}" "$BACKUP_DIR"/ || {
      echo "ERROR: Failed to back up local DB (disk full or permissions error?)."
      echo "  Aborting to protect your data. Check: $LOCAL_D1_DIR"
      exit 1
    }
  fi
  find "$LOCAL_D1_DIR" -name "*.sqlite*" -delete
else
  echo "    Warning: local D1 dir not found at $LOCAL_D1_DIR (will be created on first run)"
fi

npx wrangler d1 execute "$DB_NAME" --local --file="$SORTED_FILE" || {
  echo "ERROR: DB import failed."
  if ls "$BACKUP_DIR"/*.sqlite* &>/dev/null; then
    echo "  Restoring previous local DB..."
    mkdir -p "$LOCAL_D1_DIR"
    cp "$BACKUP_DIR"/*.sqlite* "$LOCAL_D1_DIR"/
    echo "  Previous DB restored."
  else
    echo "  No backup available — run 'npm run db:migrate && npm run db:seed' to rebuild."
  fi
  exit 1
}

# ── 4. Re-apply seed (test accounts + sample data) ───────────────────────────
echo "==> [4/5] Re-applying seed (test accounts + sample data)..."
npx wrangler d1 execute "$DB_NAME" --local --file=db/seeds/seed.sql || {
  echo "ERROR: Seed step failed."
  echo "  The prod data import succeeded — your local DB has production data."
  echo "  Only the test accounts and sample data are missing. To add them manually:"
  echo "    npm run db:seed"
  exit 1
}

echo ""
echo "==> [5/5] Done."
echo "✓  Local DB synced from production."
echo "   Test accounts (password: Test123!):"
echo "     admin@netereka.test  — role: admin"
echo "     client@test.com      — role: customer"
