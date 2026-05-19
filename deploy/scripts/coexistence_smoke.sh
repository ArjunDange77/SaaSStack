#!/usr/bin/env bash
# Run PG + School Bus smokes on one API (unified staging) or legacy dual-URL mode.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ -n "${STAGING_API_URL:-}" ]]; then
  if [[ -n "${SB_STAGING_API_URL:-}" && "${SB_STAGING_API_URL}" != "${STAGING_API_URL}" ]]; then
    echo "=== Legacy dual-URL mode ==="
    API_BASE_URL="$STAGING_API_URL" EXPECTED_ENV=staging bash "$ROOT/deploy/scripts/smoke_public_api.sh"
    API_BASE_URL="$STAGING_API_URL" bash "$ROOT/deploy/scripts/smoke_test.sh" || true
    API_BASE_URL="$SB_STAGING_API_URL" EXPECTED_ENV=staging bash "$ROOT/deploy/scripts/smoke_schoolbus_staging.sh"
  else
    echo "=== Unified staging (single API) ==="
    API_BASE_URL="$STAGING_API_URL" EXPECTED_ENV=staging bash "$ROOT/deploy/scripts/smoke_unified_staging.sh"
  fi
elif [[ -n "${SB_STAGING_API_URL:-}" ]]; then
  echo "=== School Bus only ==="
  API_BASE_URL="$SB_STAGING_API_URL" EXPECTED_ENV=staging bash "$ROOT/deploy/scripts/smoke_schoolbus_staging.sh"
fi

echo "Coexistence smoke finished."
