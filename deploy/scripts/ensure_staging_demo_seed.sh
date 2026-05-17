#!/usr/bin/env bash
# If public seatmap has fewer than MIN rooms, run idempotent pg-demo seed (restarts App Service).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"
MIN_ROOMS="${SMOKE_MIN_SEATMAP_ROOMS:-48}"
PUBLIC_TENANT="${SMOKE_PUBLIC_TENANT:-pg-demo}"

count_rooms() {
  python3 - <<'PY'
import json
import os
import urllib.request

api = os.environ["API_URL"].rstrip("/")
tenant = os.environ["PUBLIC_TENANT"]
url = f"{api}/api/pg/public/{tenant}/rooms/seatmap/"
with urllib.request.urlopen(url, timeout=30) as resp:
    data = json.load(resp)
print(int(data.get("summary", {}).get("total_rooms", 0)))
PY
}

export API_URL PUBLIC_TENANT
TOTAL="$(count_rooms)"
echo "Public seatmap rooms: ${TOTAL} (minimum ${MIN_ROOMS})"

if [ "$TOTAL" -ge "$MIN_ROOMS" ]; then
  echo "Demo data sufficient; skip seed."
  exit 0
fi

echo "Sparse demo data — seeding pg-demo..."
bash "$ROOT/deploy/scripts/seed_staging_demo.sh"

export API_URL PUBLIC_TENANT
TOTAL="$(count_rooms)"
if [ "$TOTAL" -lt "$MIN_ROOMS" ]; then
  echo "Seed failed: seatmap still has ${TOTAL} rooms (need ${MIN_ROOMS})"
  exit 1
fi
echo "Seed OK: ${TOTAL} rooms on seatmap."
