#!/usr/bin/env bash
# Trigger idempotent demo seed on App Service via SEED_STAGING_DEMO app setting + restart.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
APP="${AZURE_WEBAPP_NAME:-saasstack-staging-api}"
WAIT_SEC="${SEED_WAIT_SEC:-120}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required."
  exit 1
fi

echo "Enabling SEED_STAGING_DEMO on $APP..."
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_STAGING_DEMO=true \
  --output none

echo "Restarting app (seed runs in entrypoint)..."
az webapp restart --resource-group "$RG" --name "$APP" --output none

echo "Waiting ${WAIT_SEC}s for container + seed..."
sleep "$WAIT_SEC"

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_STAGING_DEMO=false \
  --output none

echo "Demo seed triggered. Verify: python manage.py shell on SSH or run smoke_test.sh"
