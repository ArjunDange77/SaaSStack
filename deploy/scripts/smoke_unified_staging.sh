#!/usr/bin/env bash
# Unified staging smoke: PG + School Bus on one API (rg-saasstack-staging).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/goa_pilot_count.sh
source "$ROOT/deploy/scripts/lib/goa_pilot_count.sh"
# shellcheck source=lib/resolve_swa_url.sh
source "$ROOT/deploy/scripts/lib/resolve_swa_url.sh"

API_BASE_URL="${API_BASE_URL:-${STAGING_API_URL:-}}"

if [[ -z "$API_BASE_URL" ]]; then
  echo "Set API_BASE_URL or STAGING_API_URL"
  exit 1
fi

export API_BASE_URL
export EXPECTED_ENV="${EXPECTED_ENV:-staging}"
export EXPECTED_VERSION="${EXPECTED_VERSION:-}"

UNIFIED_SWA_URL="$(resolve_unified_swa_url)"
LEGACY_SWA_URL="${SMOKE_SWA_URL:-${SMOKE_WEB_URL:-}}"
WRONG_NAME_URL="https://${STATIC_WEB_APP_NAME:-saasstack-staging-web}.azurestaticapps.net"
if [[ "$WRONG_NAME_URL" != "$UNIFIED_SWA_URL" ]]; then
  echo "NOTE: SWA hostname is ${UNIFIED_SWA_URL} (not ${WRONG_NAME_URL})"
fi

echo "=== Unified staging smoke: $API_BASE_URL ==="

check_swa_url() {
  local url=$1
  local label=$2
  local status
  status="$(curl -sS -o /dev/null -w "%{http_code}" "${url%/}/" 2>/dev/null || echo "000")"
  if [[ "$status" == "404" ]] || [[ "$status" == "000" ]] || [[ "$status" -ge 400 ]]; then
    echo "FAIL: ${label} SWA HTTP ${status} at ${url}/" >&2
    return 1
  fi
  echo "OK: ${label} SWA HTTP ${status} at ${url}/"
  return 0
}

echo "--- Static Web App (frontend) ---"
check_swa_url "$UNIFIED_SWA_URL" "Unified"

if [[ -n "$LEGACY_SWA_URL" && "$LEGACY_SWA_URL" != "$UNIFIED_SWA_URL" ]]; then
  echo "WARN: SMOKE_SWA_URL is legacy (${LEGACY_SWA_URL}); update GitHub staging secret to ${UNIFIED_SWA_URL}"
  check_swa_url "$LEGACY_SWA_URL" "Legacy (SMOKE_SWA_URL)" || true
fi

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

if [[ -n "${GOA_MIN_STUDENTS:-}" ]]; then
  echo "--- Goa pilot data (min ${GOA_MIN_STUDENTS} students) ---"
  export API_URL="$API_BASE_URL"
  export GOA_TENANT="${SB_SMOKE_TENANT:-sai-baba-school-bus}"
  export GOA_USER="${SB_SMOKE_USER:-kamlesh}"
  export GOA_PASSWORD="${SB_SMOKE_PASSWORD:-admin}"
  assert_goa_pilot_min_students "$API_BASE_URL"
fi

echo "Unified staging smoke passed."
