#!/usr/bin/env bash
# Unified staging smoke: PG + School Bus on one API (rg-saasstack-staging).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_BASE_URL="${API_BASE_URL:-${STAGING_API_URL:-}}"

if [[ -z "$API_BASE_URL" ]]; then
  echo "Set API_BASE_URL or STAGING_API_URL"
  exit 1
fi

export API_BASE_URL
export EXPECTED_ENV="${EXPECTED_ENV:-staging}"
export EXPECTED_VERSION="${EXPECTED_VERSION:-}"

echo "=== Unified staging smoke: $API_BASE_URL ==="

echo "--- Health / env ---"
API_BASE_URL="$API_BASE_URL" EXPECTED_ENV="$EXPECTED_ENV" EXPECTED_VERSION="$EXPECTED_VERSION" \
  bash "$ROOT/deploy/scripts/smoke_public_api.sh"

echo "--- PG Management (pg-demo) ---"
API_BASE_URL="$API_BASE_URL" \
  SMOKE_USERNAME="${SMOKE_USERNAME:-}" \
  SMOKE_PASSWORD="${SMOKE_PASSWORD:-}" \
  bash "$ROOT/deploy/scripts/smoke_test.sh"

echo "--- School Bus (sai-baba-school-bus) ---"
export SB_SMOKE_USER="${SB_SMOKE_USER:-kamlesh}"
export SB_SMOKE_PASSWORD="${SB_SMOKE_PASSWORD:-admin}"
export SB_SMOKE_TENANT="${SB_SMOKE_TENANT:-sai-baba-school-bus}"
API_BASE_URL="$API_BASE_URL" bash "$ROOT/deploy/scripts/smoke_schoolbus_staging.sh"

echo "Unified staging smoke passed."
