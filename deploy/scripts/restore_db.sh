#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: restore_db.sh <backup.sql>" >&2
  exit 1
fi

if [ "${DEPLOY_PROFILE:-staging}" = "production" ]; then
  echo "Production restore requires explicit approval. Set DEPLOY_PROFILE=staging for drills." >&2
  exit 1
fi

BACKUP="$1"
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  < "$BACKUP"

echo "Restore complete from $BACKUP"
