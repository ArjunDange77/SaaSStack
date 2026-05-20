#!/usr/bin/env bash
# Early deploy gate: wait for API health, then verify public booking JSON.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_BASE_URL="${API_BASE_URL:?API_BASE_URL required}"
PUBLIC_TENANT="${SMOKE_PUBLIC_TENANT:-pg-demo}"
EXPECTED_ENV="${EXPECTED_ENV:-}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"

export API_BASE_URL EXPECTED_ENV EXPECTED_VERSION
bash "$ROOT/deploy/scripts/wait_for_api.sh"

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
