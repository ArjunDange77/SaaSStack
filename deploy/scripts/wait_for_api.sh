#!/usr/bin/env bash
# Poll /api/health/ until ok and optional env + version match (waits through old container).
set -euo pipefail

API_BASE_URL="${API_BASE_URL:?API_BASE_URL required}"
EXPECTED_ENV="${EXPECTED_ENV:-}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-48}"
SLEEP_SECS="${SLEEP_SECS:-5}"

health_matches() {
  local body="$1"
  echo "$body" | grep -q '"status": "ok"' || return 1
  if [ -n "$EXPECTED_ENV" ]; then
    echo "$body" | grep -q "\"environment\": \"${EXPECTED_ENV}\"" || return 1
  fi
  if [ -n "$EXPECTED_VERSION" ]; then
    echo "$body" | grep -q "\"version\": \"${EXPECTED_VERSION}\"" || return 1
  fi
  return 0
}

is_app_down() {
  local body="$1"
  echo "$body" | grep -qi 'Application Error' && return 0
  return 1
}

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  BODY=$(curl -sS "${API_BASE_URL}/api/health/" 2>/dev/null || true)
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/health/" 2>/dev/null || echo "000")

  if is_app_down "$BODY" || [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "502" ]; then
    echo "App Service container not healthy (HTTP ${HTTP_CODE}) — check Azure Log stream (attempt ${i}/${MAX_ATTEMPTS})"
    sleep "$SLEEP_SECS"
    continue
  fi

  if health_matches "$BODY"; then
    echo "$BODY"
    exit 0
  fi

  if echo "$BODY" | grep -q '"status": "ok"'; then
    echo "API up but not ready yet (attempt ${i}/${MAX_ATTEMPTS}):"
    echo "$BODY"
    if [ -n "$EXPECTED_VERSION" ]; then
      echo "  waiting for version ${EXPECTED_VERSION}..."
    fi
  else
    echo "Waiting for API (attempt ${i}/${MAX_ATTEMPTS}, HTTP ${HTTP_CODE})..."
  fi
  sleep "$SLEEP_SECS"
done

echo "API health check failed after ${MAX_ATTEMPTS} attempts (expected env=${EXPECTED_ENV:-any} version=${EXPECTED_VERSION:-any})"
echo "If you see Application Error in Azure, the container crashed — open Log stream for saasstack-staging-api."
exit 1
