#!/usr/bin/env bash
# Early deploy gate: public booking + health before frontend upload.
set -euo pipefail

API_BASE_URL="${API_BASE_URL:?API_BASE_URL required}"
PUBLIC_TENANT="${SMOKE_PUBLIC_TENANT:-pg-demo}"
EXPECTED_ENV="${EXPECTED_ENV:-}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"

echo "Early gate: health..."
for i in $(seq 1 30); do
  BODY=$(curl -sf "${API_BASE_URL}/api/health/" || true)
  if echo "$BODY" | grep -q '"status": "ok"'; then
    if [ -n "$EXPECTED_ENV" ]; then
      echo "$BODY" | grep -q "\"environment\": \"${EXPECTED_ENV}\"" || {
        echo "Health environment mismatch (expected ${EXPECTED_ENV})"
        exit 1
      }
    fi
    if [ -n "$EXPECTED_VERSION" ]; then
      echo "$BODY" | grep -q "\"version\": \"${EXPECTED_VERSION}\"" || {
        echo "Health version mismatch (expected ${EXPECTED_VERSION})"
        exit 1
      }
    fi
    echo "$BODY"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Health check failed after 30 attempts"
    exit 1
  fi
  sleep 10
done

echo "Early gate: public booking rooms..."
ROOMS_URL="${API_BASE_URL}/api/pg/public/${PUBLIC_TENANT}/rooms/available/"
HTTP_CODE=$(curl -s -o /tmp/smoke_rooms.json -w "%{http_code}" "$ROOMS_URL")
if [ "$HTTP_CODE" != "200" ]; then
  echo "SMOKE FAIL: public booking rooms status ${HTTP_CODE}"
  cat /tmp/smoke_rooms.json
  exit 1
fi
if ! python3 -c "import json; json.load(open('/tmp/smoke_rooms.json'))" 2>/dev/null; then
  echo "SMOKE FAIL: public booking rooms response is not JSON"
  cat /tmp/smoke_rooms.json
  exit 1
fi
echo "SMOKE OK: public booking reachable (early gate)"
