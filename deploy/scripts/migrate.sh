#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.staging}"

echo "Running migrations (${DJANGO_SETTINGS_MODULE})..."
python manage.py migrate --noinput
echo "Migrations complete."
