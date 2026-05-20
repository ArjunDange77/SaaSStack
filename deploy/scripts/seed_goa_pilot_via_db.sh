#!/usr/bin/env bash
# Seed sai-baba-school-bus via Azure Postgres from CI (same credentials as migrate.sh; no app restart).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.staging}"

for var in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DB_HOST; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: ${var} is required (same secrets as migrate step)" >&2
    exit 1
  fi
done

export DB_PORT="${DB_PORT:-5432}"

export PYTHONUNBUFFERED=1

echo "Seeding Goa pilot in database (${DJANGO_SETTINGS_MODULE})..."
echo "  DB host: ${DB_HOST}"
echo "  DB name: ${POSTGRES_DB}"
echo "  (Goa pilot seed can take several minutes on Azure Postgres; progress lines follow.)"

python -u manage.py seed_goa_pilot --reset

echo "Goa pilot database seed complete."
