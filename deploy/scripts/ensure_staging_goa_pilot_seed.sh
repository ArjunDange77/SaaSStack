#!/usr/bin/env bash
# If sai-baba-school-bus has sparse data, run Goa pilot seed on unified staging API.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"
MIN_STUDENTS="${GOA_MIN_STUDENTS:-15}"
GOA_TENANT="${GOA_TENANT:-sai-baba-school-bus}"
GOA_USER="${GOA_USER:-kamlesh}"
GOA_PASSWORD="${GOA_PASSWORD:-admin}"

count_students() {
  python3 - <<'PY'
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
}

export API_URL GOA_TENANT GOA_USER GOA_PASSWORD
TOTAL="$(count_students)"
echo "Goa pilot total_students: ${TOTAL} (minimum ${MIN_STUDENTS})"

if [ "$TOTAL" -ge "$MIN_STUDENTS" ]; then
  echo "Goa pilot data sufficient; skip seed."
  exit 0
fi

echo "Sparse Goa pilot data — seeding..."
export AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
export AZURE_WEBAPP_NAME="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
export DEPLOY_SLOT="${DEPLOY_SLOT:-}"
bash "$ROOT/deploy/scripts/seed_staging_goa_pilot.sh"

export API_URL GOA_TENANT GOA_USER GOA_PASSWORD
TOTAL="$(count_students)"
if [ "$TOTAL" -lt "$MIN_STUDENTS" ]; then
  echo "Goa pilot seed failed: still ${TOTAL} students (need ${MIN_STUDENTS})"
  exit 1
fi
echo "Goa pilot seed verified (${TOTAL} students)."
