#!/usr/bin/env bash
# Create deployment slot if missing (Linux App Service / container apps).
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP required}"
SLOT="${DEPLOY_SLOT:-staging}"
API_APP="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
FE_APP="${AZURE_WEBAPP_NAME_FRONTEND:-}"

ensure_slot() {
  local app=$1
  if az webapp deployment slot list -g "$RG" -n "$app" --query "[?name=='${SLOT}'].name" -o tsv 2>/dev/null | grep -qx "$SLOT"; then
    echo "OK: ${app}/${SLOT} exists"
    return 0
  fi
  echo "Creating deployment slot ${SLOT} on ${app}..."
  if ! az webapp deployment slot create \
    --resource-group "$RG" \
    --name "$app" \
    --slot "$SLOT" \
    --configuration-source "$app" 2>/dev/null; then
    echo "WARN: could not create slot (may already exist or RBAC pending); continuing."
  fi
}

ensure_slot "$API_APP"
if [[ -n "$FE_APP" ]]; then
  ensure_slot "$FE_APP"
fi
