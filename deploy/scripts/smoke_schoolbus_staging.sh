#!/usr/bin/env bash
# Smoke test School Bus staging API (health + dashboard); optional slot URL via API_BASE_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_BASE_URL="${API_BASE_URL:-${STAGING_API_URL:-}}"
EXPECTED_ENV="${EXPECTED_ENV:-staging}"

if [[ -z "$API_BASE_URL" ]]; then
  echo "Set API_BASE_URL or STAGING_API_URL"
  exit 1
fi

export API_BASE_URL
export EXPECTED_ENV
export EXPECTED_VERSION="${EXPECTED_VERSION:-}"

echo "School Bus smoke: $API_BASE_URL"
bash "$ROOT/deploy/scripts/smoke_public_api.sh"

# Dashboard requires auth — only check route exists (401/403 acceptable without creds)
status="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/sb/dashboard/")"
if [[ "$status" == "401" || "$status" == "403" || "$status" == "200" ]]; then
  echo "OK: /api/sb/dashboard/ responded with $status"
else
  echo "FAIL: /api/sb/dashboard/ returned $status"
  exit 1
fi

# Optional authenticated smoke when SB_SMOKE_USER / SB_SMOKE_PASSWORD are set (tenant sb-demo)
if [[ -n "${SB_SMOKE_USER:-}" && -n "${SB_SMOKE_PASSWORD:-}" ]]; then
  token="$(curl -s -X POST "${API_BASE_URL}/api/accounts/token/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SB_SMOKE_USER}\",\"password\":\"${SB_SMOKE_PASSWORD}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))" 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    tenant="${SB_SMOKE_TENANT:-sb-demo}"
    case "${SB_SMOKE_USER}" in
      sb-parent) paths="parent/me" ;;
      sb-driver) paths="driver/today" ;;
      *) paths="operator/dashboard" ;;
    esac
    for path in $paths; do
      code="$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${token}" \
        -H "X-Tenant: ${tenant}" \
        "${API_BASE_URL}/api/sb/${path}/")"
      if [[ "$code" != "200" ]]; then
        echo "FAIL: /api/sb/${path}/ returned $code for ${SB_SMOKE_USER}"
        exit 1
      fi
      echo "OK: /api/sb/${path}/ → $code"
    done
  else
    echo "WARN: could not obtain token for SB_SMOKE_USER; skipping authenticated checks"
  fi
fi

echo "School Bus staging smoke passed."
