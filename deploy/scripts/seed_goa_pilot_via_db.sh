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

echo "Seeding Goa pilot in database (${DJANGO_SETTINGS_MODULE})..."
echo "  DB host: ${DB_HOST}"
echo "  DB name: ${POSTGRES_DB}"

python manage.py seed_kernel
python manage.py seed_goa_pilot --reset

echo "Goa pilot database seed complete."
