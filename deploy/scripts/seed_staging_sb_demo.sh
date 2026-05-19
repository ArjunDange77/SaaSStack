#!/usr/bin/env bash
# Re-seed sb-demo on School Bus staging (restarts App Service).
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-sb-staging}"
APP="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"
SB_TENANT="${SB_SMOKE_TENANT:-sb-demo}"
SB_USER="${SB_SMOKE_USER:-sb-operator}"
SB_PASSWORD="${SB_SMOKE_PASSWORD:-admin}"

echo "Enabling SEED_SB_STAGING_DEMO and restarting ${APP}..."
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_SB_STAGING_DEMO=true \
  --output none
az webapp restart --resource-group "$RG" --name "$APP" --output none

SEEDED=0
for i in $(seq 1 36); do
  if curl -sf "${API_URL}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SB_USER}\",\"password\":\"${SB_PASSWORD}\"}" | grep -q access; then
    echo "Seed verified: ${SB_USER} login OK"
    SEEDED=1
    break
  fi
  echo "Waiting for seed (attempt ${i}/36)..."
  sleep 10
done

if [ "$SEEDED" != 1 ]; then
  echo "Seed failed: ${SB_USER} login not available after restart"
  exit 1
fi

export API_URL SB_TENANT SB_USER SB_PASSWORD
STUDENTS="$(python3 - <<'PY'
import json
import os
import urllib.request

api = os.environ["API_URL"].rstrip("/")
tenant = os.environ["SB_TENANT"]
user = os.environ["SB_USER"]
password = os.environ["SB_PASSWORD"]

login_req = urllib.request.Request(
    f"{api}/api/auth/login/",
    data=json.dumps({"username": user, "password": password}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(login_req, timeout=30) as resp:
    token = json.load(resp)["access"]

dash_req = urllib.request.Request(
    f"{api}/api/sb/operator/dashboard/",
    headers={"Authorization": f"Bearer {token}", "X-Tenant": tenant},
)
with urllib.request.urlopen(dash_req, timeout=30) as resp:
    data = json.load(resp)
print(int(data.get("total_students", 0)))
PY
)"

echo "Operator dashboard total_students: ${STUDENTS}"
if [ "$STUDENTS" -lt 1 ]; then
  echo "Seed failed: expected at least 1 student on dashboard"
  exit 1
fi

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_SB_STAGING_DEMO=false \
  --output none
echo "SEED_SB_STAGING_DEMO disabled. School Bus demo seed OK (${STUDENTS} students)."
