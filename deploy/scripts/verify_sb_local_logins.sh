#!/usr/bin/env bash
# Verify sb-demo logins against local API (default http://localhost:8000).
set -euo pipefail

API="${API_BASE_URL:-http://localhost:8000}"
TENANT="${SB_SMOKE_TENANT:-sb-demo}"
PASS="${SB_SMOKE_PASSWORD:-admin}"

check_login() {
  local user="$1"
  local path="$2"
  local body
  body=$(curl -sS -X POST "${API}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${user}\",\"password\":\"${PASS}\"}")
  echo "$body" | grep -q '"access"' || {
    echo "FAIL login: ${user}"
    echo "$body"
    return 1
  }
  local token
  token=$(python3 -c "import json,sys; print(json.load(sys.stdin)['access'])" <<<"$body")
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${token}" \
    -H "X-Tenant: ${TENANT}" \
    "${API}${path}")
  if [[ "$code" != "200" ]]; then
    echo "FAIL ${user} ${path} HTTP ${code}"
    return 1
  fi
  echo "OK ${user} ${path}"
}

echo "School Bus local login check (${API}, tenant ${TENANT})"
check_login sb-operator "/api/sb/operator/dashboard/"
check_login sb-driver "/api/sb/driver/today/"
check_login sb-parent "/api/sb/parent/me/"
echo "All three roles OK."
