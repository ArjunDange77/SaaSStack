#!/usr/bin/env bash
# Seed sai-baba-school-bus on unified staging API (rg-saasstack-staging; no deployment slot).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Unified stack uses production slot only. Set DEPLOY_SLOT=staging only for legacy saasstack-sb-staging-api.
DEPLOY_SLOT="${DEPLOY_SLOT:-}"
# shellcheck source=lib/app_service_slot_args.sh
source "$ROOT/deploy/scripts/lib/app_service_slot_args.sh"

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
APP="${AZURE_WEBAPP_NAME:-saasstack-staging-api}"

if ! command -v az >/dev/null 2>&1; then
  echo "Install Azure CLI and run: az login" >&2
  exit 1
fi

reconcile_deploy_slot_or_fail "$RG" "$APP"
API_URL="${STAGING_API_URL:-https://saasstack-staging-api.azurewebsites.net}"

GOA_TENANT="${GOA_TENANT:-sai-baba-school-bus}"
GOA_USER="${GOA_USER:-kamlesh}"
GOA_PASSWORD="${GOA_PASSWORD:-admin}"
MIN_STUDENTS="${GOA_MIN_STUDENTS:-15}"
MAX_ATTEMPTS="${SEED_MAX_ATTEMPTS:-60}"
SLEEP_SECS="${SEED_SLEEP_SECS:-10}"

slot_label="production"
[[ -n "$DEPLOY_SLOT" ]] && slot_label="$DEPLOY_SLOT"
echo "Unified staging Goa pilot seed"
echo "  Resource group: $RG"
echo "  API app:        $APP (slot: ${slot_label})"
echo "  API URL:        $API_URL"
echo ""
echo "Requires API image with seed_goa_pilot + entrypoint SEED_GOA_PILOT_STAGING (run Deploy Staging on main first)."
echo "Enabling SEED_GOA_PILOT_STAGING and restarting (seed may take 2–5 min on boot)..."

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  "${SLOT_ARGS[@]}" \
  --settings SEED_GOA_PILOT_STAGING=true \
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

  export API_URL GOA_TENANT GOA_USER GOA_PASSWORD
  STUDENTS="$(python3 - <<'PY'
import json
import os
import urllib.error
import urllib.request

api = os.environ["API_URL"].rstrip("/")
tenant = os.environ["GOA_TENANT"]
user = os.environ["GOA_USER"]
password = os.environ["GOA_PASSWORD"]

try:
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
        print(int(json.load(resp).get("total_students", 0)))
except Exception:
    print(0)
PY
)" || STUDENTS=0

  if [ "${STUDENTS:-0}" -ge "$MIN_STUDENTS" ]; then
    echo "Goa pilot verified: ${GOA_USER} @ ${GOA_TENANT} — ${STUDENTS} students"
    SEEDED=1
    break
  fi
  echo "Waiting for sai-baba-school-bus (students=${STUDENTS:-0}, need ${MIN_STUDENTS}, attempt ${i}/${MAX_ATTEMPTS})..."
  sleep "$SLEEP_SECS"
done

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  "${SLOT_ARGS[@]}" \
  --settings SEED_GOA_PILOT_STAGING=false \
  --output none

if [ "$SEEDED" != 1 ]; then
  echo ""
  echo "Seed did not verify. Check logs:"
  echo "  az webapp log tail --resource-group ${RG} --name ${APP} ${SLOT_ARGS[*]}"
  echo ""
  echo "Manual fallback — Azure Portal → ${APP} → SSH (slot: ${slot_label}):"
  echo "  python manage.py migrate --noinput"
  echo "  python manage.py seed_goa_pilot --reset"
  exit 1
fi

echo ""
echo "Done. Log in:"
echo "  https://saasstack-staging-web.azurestaticapps.net (or SMOKE_SWA_URL)"
echo "  Tenant: ${GOA_TENANT}  |  kamlesh / suresh / priya  |  password: ${GOA_PASSWORD}"
