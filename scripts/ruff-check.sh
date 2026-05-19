#!/usr/bin/env bash
# Backend Ruff lint — same paths as .github/workflows/ci.yml (run locally before push).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

if ! command -v ruff >/dev/null 2>&1; then
  echo "ruff not found. Install dev deps: pip install -r requirements-dev.txt" >&2
  exit 1
fi

echo "==> Ruff (local only)"
ruff check \
  config \
  apps/registry/middleware.py \
  apps/registry/logging_filters.py \
  apps/registry/storage.py \
  apps/registry/tests/test_health.py \
  config/health.py \
  apps/tenancy/middleware.py \
  apps/products/pg_management/views.py \
  apps/products/pg_management/serializers.py \
  apps/products/pg_management/throttles.py \
  apps/products/pg_management/validators.py \
  apps/products/school_bus/
