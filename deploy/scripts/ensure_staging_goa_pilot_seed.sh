#!/usr/bin/env bash
# Ensure sai-baba-school-bus has Goa pilot data (CI: Postgres seed; optional API verify).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/goa_pilot_count.sh
source "$ROOT/deploy/scripts/lib/goa_pilot_count.sh"

MIN_STUDENTS="${GOA_MIN_STUDENTS:-15}"
GOA_TENANT="${GOA_TENANT:-sai-baba-school-bus}"
GOA_USER="${GOA_USER:-kamlesh}"
GOA_PASSWORD="${GOA_PASSWORD:-admin}"
SEED_GOA_FORCE="${SEED_GOA_FORCE:-false}"

api_student_count() {
  if [[ -z "${STAGING_API_URL:-}" ]]; then
    echo 0
    return
  fi
  export API_URL="$STAGING_API_URL"
  export GOA_TENANT GOA_USER GOA_PASSWORD
  goa_pilot_student_count
}

api_health_ok() {
  [[ -n "${STAGING_API_URL:-}" ]] || return 1
  curl -sf "${STAGING_API_URL%/}/api/health/" 2>/dev/null | grep -q '"status": "ok"'
}

TOTAL=0
if api_health_ok; then
  TOTAL="$(api_student_count)"
  echo "Goa pilot total_students (API): ${TOTAL} (minimum ${MIN_STUDENTS})"
else
  echo "Goa pilot: API not reachable for pre-check; will seed via database."
fi

if [[ "$SEED_GOA_FORCE" != "true" && "$TOTAL" -ge "$MIN_STUDENTS" ]]; then
  echo "Goa pilot data sufficient; skip seed."
  exit 0
fi

if [[ "$SEED_GOA_FORCE" == "true" ]]; then
  echo "SEED_GOA_FORCE=true — re-seeding Goa pilot via database..."
else
  echo "Sparse Goa pilot data — seeding via database..."
fi

echo "Goa DB seed may take several minutes on Azure Postgres (progress lines will appear)."
bash "$ROOT/deploy/scripts/seed_goa_pilot_via_db.sh"

if api_health_ok; then
  TOTAL="$(api_student_count)"
  if [[ "$TOTAL" -lt "$MIN_STUDENTS" ]]; then
    if [[ "${GOA_SEED_FALLBACK_RESTART:-false}" == "true" ]]; then
      echo "API still sparse after DB seed; trying appsettings restart fallback..."
      export AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
      export AZURE_WEBAPP_NAME="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
      export DEPLOY_SLOT="${DEPLOY_SLOT:-}"
      bash "$ROOT/deploy/scripts/seed_staging_goa_pilot.sh"
      TOTAL="$(api_student_count)"
    fi
    if [[ "$TOTAL" -lt "$MIN_STUDENTS" ]]; then
      echo "Goa pilot seed failed: API reports ${TOTAL} students (need ${MIN_STUDENTS})"
      exit 1
    fi
  fi
  echo "Goa pilot seed verified via API (${TOTAL} students)."
else
  echo "Goa pilot DB seed done; API verify deferred until deploy/smoke."
fi
