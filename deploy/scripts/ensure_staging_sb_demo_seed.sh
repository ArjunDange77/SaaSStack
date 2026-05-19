#!/usr/bin/env bash
# If sb-demo operator dashboard has no students, run idempotent seed (restarts App Service).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"
MIN_STUDENTS="${SB_SMOKE_MIN_STUDENTS:-1}"
SB_TENANT="${SB_SMOKE_TENANT:-sb-demo}"
SB_USER="${SB_SMOKE_USER:-sb-operator}"
SB_PASSWORD="${SB_SMOKE_PASSWORD:-admin}"

count_students() {
  python3 - <<'PY'
import json
import os
import sys
import urllib.error
import urllib.request

api = os.environ["API_URL"].rstrip("/")
tenant = os.environ["SB_TENANT"]
user = os.environ["SB_USER"]
password = os.environ["SB_PASSWORD"]

try:
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
except urllib.error.HTTPError:
    print(0)
except Exception:
    print(0)
PY
}

export API_URL SB_TENANT SB_USER SB_PASSWORD
TOTAL="$(count_students)"
echo "sb-demo total_students on dashboard: ${TOTAL} (minimum ${MIN_STUDENTS})"

if [ "$TOTAL" -ge "$MIN_STUDENTS" ]; then
  echo "School Bus demo data sufficient; skip seed."
  exit 0
fi

echo "Sparse sb-demo data — seeding..."
export DEPLOY_SLOT="${DEPLOY_SLOT:-staging}"
export AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-saasstack-sb-staging}"
export AZURE_WEBAPP_NAME="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
bash "$ROOT/deploy/scripts/seed_staging_sb_demo.sh"

export API_URL SB_TENANT SB_USER SB_PASSWORD
TOTAL="$(count_students)"
if [ "$TOTAL" -lt "$MIN_STUDENTS" ]; then
  echo "Seed failed: dashboard still has ${TOTAL} students (need ${MIN_STUDENTS})"
  exit 1
fi
echo "School Bus demo seed verified (${TOTAL} students)."
