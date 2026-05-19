#!/usr/bin/env bash
# If sai-baba-school-bus has sparse data, run Goa pilot seed on unified staging API.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/goa_pilot_count.sh
source "$ROOT/deploy/scripts/lib/goa_pilot_count.sh"

API_URL="${STAGING_API_URL:?STAGING_API_URL required}"
MIN_STUDENTS="${GOA_MIN_STUDENTS:-15}"
GOA_TENANT="${GOA_TENANT:-sai-baba-school-bus}"
GOA_USER="${GOA_USER:-kamlesh}"
GOA_PASSWORD="${GOA_PASSWORD:-admin}"

export API_URL GOA_TENANT GOA_USER GOA_PASSWORD
TOTAL="$(goa_pilot_student_count)"
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
