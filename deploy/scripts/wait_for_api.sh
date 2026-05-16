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

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  BODY=$(curl -sf "${API_BASE_URL}/api/health/" || true)
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
    echo "Waiting for API (attempt ${i}/${MAX_ATTEMPTS})..."
  fi
  sleep "$SLEEP_SECS"
done

echo "API health check failed after ${MAX_ATTEMPTS} attempts (expected env=${EXPECTED_ENV:-any} version=${EXPECTED_VERSION:-any})"
exit 1
