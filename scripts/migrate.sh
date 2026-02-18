#!/usr/bin/env bash
set -euo pipefail

# D1 Migration Runner
# Tracks applied migrations in a _migrations table and runs pending ones.
# Usage: bash scripts/migrate.sh [--local|--remote]

DB_NAME="netereka-db"
MIGRATIONS_DIR="db/migrations"
TARGET="${1:---remote}"

if [[ "$TARGET" != "--local" && "$TARGET" != "--remote" ]]; then
  echo "Usage: bash scripts/migrate.sh [--local|--remote]"
  exit 1
fi

echo "==> Running migrations ($TARGET) on $DB_NAME"

# 1. Ensure _migrations tracking table exists
npx wrangler d1 execute "$DB_NAME" "$TARGET" --command \
  "CREATE TABLE IF NOT EXISTS _migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );"

# 2. Get list of already-applied migrations
APPLIED=$(npx wrangler d1 execute "$DB_NAME" "$TARGET" --command \
  "SELECT filename FROM _migrations ORDER BY filename;" --json \
  | node -e "
    const input = require('fs').readFileSync('/dev/stdin','utf8');
    const rows = JSON.parse(input)[0].results;
    rows.forEach(r => console.log(r.filename));
  " 2>/dev/null || true)

# 3. Get sorted list of migration files
MIGRATION_FILES=($(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  echo "==> No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

# 4. Bootstrap: if _migrations is empty but DB has tables, seed all filenames
if [[ -z "$APPLIED" ]]; then
  HAS_TABLES=$(npx wrangler d1 execute "$DB_NAME" "$TARGET" --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\_%' ESCAPE '\\' LIMIT 1;" --json \
    | node -e "
      const input = require('fs').readFileSync('/dev/stdin','utf8');
      const rows = JSON.parse(input)[0].results;
      console.log(rows.length > 0 ? 'yes' : 'no');
    " 2>/dev/null || echo "no")

  if [[ "$HAS_TABLES" == "yes" ]]; then
    echo "==> Bootstrap: existing DB detected, seeding migration history"
    for file in "${MIGRATION_FILES[@]}"; do
      fname=$(basename "$file")
      npx wrangler d1 execute "$DB_NAME" "$TARGET" --command \
        "INSERT OR IGNORE INTO _migrations (filename) VALUES ('$fname');"
    done
    echo "==> Bootstrap complete (${#MIGRATION_FILES[@]} migrations recorded)"
    exit 0
  fi
fi

# 5. Run pending migrations
PENDING=0
for file in "${MIGRATION_FILES[@]}"; do
  fname=$(basename "$file")

  if echo "$APPLIED" | grep -qxF "$fname"; then
    continue
  fi

  echo "==> Applying: $fname"
  npx wrangler d1 execute "$DB_NAME" "$TARGET" --file="$file"
  npx wrangler d1 execute "$DB_NAME" "$TARGET" --command \
    "INSERT INTO _migrations (filename) VALUES ('$fname');"
  echo "    Done: $fname"
  PENDING=$((PENDING + 1))
done

if [[ $PENDING -eq 0 ]]; then
  echo "==> No pending migrations"
else
  echo "==> Applied $PENDING migration(s)"
fi
