#!/usr/bin/env bash
# Poll /api/health/ until ok (optional env + version match).
set -euo pipefail

API_BASE_URL="${API_BASE_URL:?API_BASE_URL required}"
EXPECTED_ENV="${EXPECTED_ENV:-}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-48}"
SLEEP_SECS="${SLEEP_SECS:-5}"

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  BODY=$(curl -sf "${API_BASE_URL}/api/health/" || true)
  if echo "$BODY" | grep -q '"status": "ok"'; then
    if [ -n "$EXPECTED_ENV" ]; then
      echo "$BODY" | grep -q "\"environment\": \"${EXPECTED_ENV}\"" || {
        echo "Health environment mismatch (expected ${EXPECTED_ENV}, got):"
        echo "$BODY"
        exit 1
      }
    fi
    if [ -n "$EXPECTED_VERSION" ]; then
      echo "$BODY" | grep -q "\"version\": \"${EXPECTED_VERSION}\"" || {
        echo "Health version mismatch (expected ${EXPECTED_VERSION}, got):"
        echo "$BODY"
        exit 1
      }
    fi
    echo "$BODY"
    exit 0
  fi
  echo "Waiting for API (attempt ${i}/${MAX_ATTEMPTS})..."
  sleep "$SLEEP_SECS"
done

echo "API health check failed after ${MAX_ATTEMPTS} attempts"
exit 1
