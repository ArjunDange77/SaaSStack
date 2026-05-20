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
bash "$ROOT/deploy/scripts/wait_for_api.sh"

# Operator routes require auth — unauthenticated 401/403 is OK
status="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/sb/operator/briefing/")"
if [[ "$status" == "401" || "$status" == "403" || "$status" == "200" ]]; then
  echo "OK: /api/sb/operator/briefing/ responded with $status"
else
  echo "FAIL: /api/sb/operator/briefing/ returned $status"
  exit 1
fi

# Authenticated smoke when SB_SMOKE_USER / SB_SMOKE_PASSWORD are set
if [[ -n "${SB_SMOKE_USER:-}" && -n "${SB_SMOKE_PASSWORD:-}" ]]; then
  token="$(curl -s -X POST "${API_BASE_URL}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SB_SMOKE_USER}\",\"password\":\"${SB_SMOKE_PASSWORD}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))" 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    tenant="${SB_SMOKE_TENANT:-sai-baba-school-bus}"
    case "${SB_SMOKE_USER}" in
      sb-parent|priya) paths="parent/me" ;;
      sb-driver|suresh|arun) paths="driver/today" ;;
      *) paths="operator/briefing" ;;
    esac
    for path in $paths; do
      if [[ "$path" == "parent/me" ]]; then
        body="$(curl -sS -w "\n%{http_code}" \
          -H "Authorization: Bearer ${token}" \
          -H "X-Tenant: ${tenant}" \
          "${API_BASE_URL}/api/sb/${path}/")"
        code="${body##*$'\n'}"
        body="${body%$'\n'*}"
        if [[ "$code" != "200" ]]; then
          echo "FAIL: /api/sb/${path}/ returned $code for ${SB_SMOKE_USER}"
          exit 1
        fi
        echo "OK: /api/sb/${path}/ → $code"
        echo "$body" | python3 "$ROOT/deploy/scripts/lib/validate_sb_parent_me.py" || exit 1
      else
        code="$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer ${token}" \
          -H "X-Tenant: ${tenant}" \
          "${API_BASE_URL}/api/sb/${path}/")"
        if [[ "$code" != "200" ]]; then
          echo "FAIL: /api/sb/${path}/ returned $code for ${SB_SMOKE_USER}"
          exit 1
        fi
        echo "OK: /api/sb/${path}/ → $code"
      fi
    done
  else
    echo "WARN: could not obtain token for SB_SMOKE_USER; skipping authenticated checks"
  fi
fi

echo "School Bus staging smoke passed."
