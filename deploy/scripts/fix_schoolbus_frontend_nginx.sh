#!/usr/bin/env bash
# One-time fix: nginx stock image ignores zip deploy until wwwroot storage + startup are set.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-sb-staging}"
FE_APP="${AZURE_WEBAPP_NAME_FRONTEND:-saasstack-sb-staging-web}"
DEPLOY_SLOT="${DEPLOY_SLOT:-staging}"
STARTUP='/bin/sh /home/site/wwwroot/app-service-startup.sh'

# shellcheck source=lib/app_service_slot_args.sh
source "$ROOT/deploy/scripts/lib/app_service_slot_args.sh"

echo "Configuring ${FE_APP} (${DEPLOY_SLOT:-production} slot) for SPA from wwwroot..."
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$FE_APP" \
  "${SLOT_ARGS[@]}" \
  --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=true WEBSITES_PORT=80 \
  --output none
az webapp config set \
  --resource-group "$RG" \
  --name "$FE_APP" \
  "${SLOT_ARGS[@]}" \
  --startup-file "$STARTUP" \
  --output none
az webapp restart --resource-group "$RG" --name "$FE_APP" "${SLOT_ARGS[@]}" --output none
echo "Done. Redeploy frontend zip (workflow or: npm run build && zip + az webapp deploy)."
