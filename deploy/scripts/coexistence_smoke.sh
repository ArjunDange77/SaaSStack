#!/usr/bin/env bash
# Run PG and School Bus staging smokes when both URLs are configured (Phase 7 checklist).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ -n "${STAGING_API_URL:-}" ]]; then
  echo "=== PG Management staging ==="
  API_BASE_URL="$STAGING_API_URL" EXPECTED_ENV=staging bash "$ROOT/deploy/scripts/smoke_public_api.sh"
  API_BASE_URL="$STAGING_API_URL" bash "$ROOT/deploy/scripts/smoke_test.sh" || true
fi

if [[ -n "${SB_STAGING_API_URL:-}" ]]; then
  echo "=== School Bus staging ==="
  API_BASE_URL="$SB_STAGING_API_URL" EXPECTED_ENV=staging bash "$ROOT/deploy/scripts/smoke_schoolbus_staging.sh"
fi

echo "Coexistence smoke finished."
