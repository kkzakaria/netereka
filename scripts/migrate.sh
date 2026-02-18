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

# Validate required env vars for remote mode
if [[ "$TARGET" == "--remote" ]]; then
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "ERROR: CLOUDFLARE_API_TOKEN is not set. Required for --remote migrations."
    exit 1
  fi
  if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    echo "ERROR: CLOUDFLARE_ACCOUNT_ID is not set. Required for --remote migrations."
    exit 1
  fi
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
  | node -p "JSON.parse(require('fs').readFileSync(0,'utf8'))[0].results.map(r=>r.filename).join('\n')")

# 3. Get sorted list of migration files (glob is already lexicographic)
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "ERROR: Migrations directory not found: $MIGRATIONS_DIR"
  echo "Working directory: $(pwd)"
  exit 1
fi

shopt -s nullglob
MIGRATION_FILES=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  echo "==> No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

# Helper: validate migration filename contains only safe characters
validate_filename() {
  local fname="$1"
  if [[ ! "$fname" =~ ^[0-9a-zA-Z_.-]+\.sql$ ]]; then
    echo "ERROR: Invalid migration filename: $fname"
    exit 1
  fi
}

# 4. Bootstrap: if _migrations is empty but DB has tables, seed all filenames
if [[ -z "$APPLIED" ]]; then
  HAS_TABLES=$(npx wrangler d1 execute "$DB_NAME" "$TARGET" --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\_%' ESCAPE '\\' LIMIT 1;" --json \
    | node -p "JSON.parse(require('fs').readFileSync(0,'utf8'))[0].results.length > 0 ? 'yes' : 'no'")

  if [[ "$HAS_TABLES" == "yes" ]]; then
    echo "==> Bootstrap: existing DB detected, seeding migration history"
    echo "    WARNING: All ${#MIGRATION_FILES[@]} migration files will be marked as applied."
    for file in "${MIGRATION_FILES[@]}"; do
      fname=$(basename "$file")
      validate_filename "$fname"
      echo "    Recording: $fname"
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
  validate_filename "$fname"

  if [[ -n "$APPLIED" ]] && echo "$APPLIED" | grep -qxF "$fname"; then
    continue
  fi

  echo "==> Applying: $fname"
  # Combine migration SQL + tracking record into a single D1 execution for atomicity
  TMPFILE=$(mktemp)
  trap "rm -f '$TMPFILE'" EXIT
  cat "$file" > "$TMPFILE"
  printf '\nINSERT INTO _migrations (filename) VALUES ('\''%s'\'');\n' "$fname" >> "$TMPFILE"
  npx wrangler d1 execute "$DB_NAME" "$TARGET" --file="$TMPFILE"
  rm -f "$TMPFILE"
  echo "    Done: $fname"
  PENDING=$((PENDING + 1))
done

if [[ $PENDING -eq 0 ]]; then
  echo "==> No pending migrations"
else
  echo "==> Applied $PENDING migration(s)"
fi
