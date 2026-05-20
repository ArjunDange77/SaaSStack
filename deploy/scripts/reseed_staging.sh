#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.staging}"
export SEED_PG_DEMO=true

python manage.py seed_kernel
python manage.py seed_pg --demo
echo "Staging demo data reseeded."
