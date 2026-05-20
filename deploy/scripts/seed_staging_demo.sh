#!/usr/bin/env bash
# Re-seed pg-demo on staging (restarts App Service).
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
APP="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"
MIN_ROOMS="${SMOKE_MIN_SEATMAP_ROOMS:-48}"
PUBLIC_TENANT="${SMOKE_PUBLIC_TENANT:-pg-demo}"

echo "Enabling SEED_STAGING_DEMO and restarting ${APP}..."
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_STAGING_DEMO=true \
  --output none
az webapp restart --resource-group "$RG" --name "$APP" --output none

SEEDED=0
for i in $(seq 1 36); do
  if curl -sf "${API_URL}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}' | grep -q access; then
    echo "Seed verified: admin login OK"
    SEEDED=1
    break
  fi
  echo "Waiting for seed (attempt ${i}/36)..."
  sleep 10
done

if [ "$SEEDED" != 1 ]; then
  echo "Seed failed: admin login not available after restart"
  exit 1
fi

export API_URL PUBLIC_TENANT
TOTAL="$(python3 - <<'PY'
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
)"

echo "Seatmap total rooms: ${TOTAL}"
if [ "$TOTAL" -lt "$MIN_ROOMS" ]; then
  echo "Seed failed: expected at least ${MIN_ROOMS} rooms on seatmap"
  exit 1
fi

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_STAGING_DEMO=false \
  --output none
echo "SEED_STAGING_DEMO disabled. Demo seed OK (${TOTAL} rooms)."
