#!/usr/bin/env bash
# Re-seed sb-demo on School Bus staging (restarts the target App Service slot).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY_SLOT="${DEPLOY_SLOT:-staging}"
# shellcheck source=lib/app_service_slot_args.sh
source "$ROOT/deploy/scripts/lib/app_service_slot_args.sh"

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-sb-staging}"
APP="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"

SB_TENANT="${SB_SMOKE_TENANT:-sb-demo}"
SB_USER="${SB_SMOKE_USER:-sb-operator}"
SB_PASSWORD="${SB_SMOKE_PASSWORD:-admin}"
MAX_ATTEMPTS="${SEED_MAX_ATTEMPTS:-48}"
SLEEP_SECS="${SEED_SLEEP_SECS:-10}"

slot_label="${DEPLOY_SLOT:-production}"
echo "Enabling SEED_SB_STAGING_DEMO on ${APP} (${slot_label} slot) and restarting..."
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  "${SLOT_ARGS[@]}" \
  --settings SEED_SB_STAGING_DEMO=true \
  --output none
az webapp restart --resource-group "$RG" --name "$APP" "${SLOT_ARGS[@]}" --output none

SEEDED=0
for i in $(seq 1 "$MAX_ATTEMPTS"); do
  HEALTH=$(curl -sS "${API_URL}/api/health/" 2>/dev/null || true)
  if ! echo "$HEALTH" | grep -q '"status": "ok"'; then
    echo "Waiting for API health (attempt ${i}/${MAX_ATTEMPTS})..."
    sleep "$SLEEP_SECS"
    continue
  fi

  LOGIN_BODY=$(curl -sS -X POST "${API_URL}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SB_USER}\",\"password\":\"${SB_PASSWORD}\"}" 2>/dev/null || true)
  if ! echo "$LOGIN_BODY" | grep -q '"access"'; then
    echo "Waiting for ${SB_USER} login after seed (attempt ${i}/${MAX_ATTEMPTS})..."
    sleep "$SLEEP_SECS"
    continue
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
with urllib.request.urlopen(login_req, timeout=60) as resp:
    token = json.load(resp)["access"]
dash_req = urllib.request.Request(
    f"{api}/api/sb/operator/dashboard/",
    headers={"Authorization": f"Bearer {token}", "X-Tenant": tenant},
)
with urllib.request.urlopen(dash_req, timeout=60) as resp:
    data = json.load(resp)
print(int(data.get("total_students", 0)))
PY
)" || STUDENTS=0
  STUDENTS="${STUDENTS:-0}"

  if [ "${STUDENTS:-0}" -ge 1 ]; then
    echo "Seed verified: ${SB_USER} login OK, ${STUDENTS} students on dashboard"
    SEEDED=1
    break
  fi
  echo "Waiting for sb-demo data (dashboard students=${STUDENTS:-0}, attempt ${i}/${MAX_ATTEMPTS})..."
  sleep "$SLEEP_SECS"
done

if [ "$SEEDED" != 1 ]; then
  echo "Seed failed: sb-demo not ready on ${API_URL} (${slot_label} slot) after restart"
  echo "Check App Service log stream for seed_school_bus / migration errors."
  exit 1
fi

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  "${SLOT_ARGS[@]}" \
  --settings SEED_SB_STAGING_DEMO=false \
  --output none
echo "SEED_SB_STAGING_DEMO disabled. School Bus demo seed OK (${STUDENTS} students)."
