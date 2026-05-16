#!/usr/bin/env bash
# Stop billable compute for staging (App Service + PostgreSQL). Use when not demoing.
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
API_APP="${AZURE_WEBAPP_NAME:-saasstack-staging-api}"
PG_SERVER="${POSTGRES_SERVER_NAME:-saasstack-staging-pg}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required."
  exit 1
fi

echo "Stopping App Service: $API_APP ..."
az webapp stop --resource-group "$RG" --name "$API_APP" --output none 2>/dev/null || \
  echo "(webapp stop failed — check name/RG)"

echo "Stopping PostgreSQL: $PG_SERVER ..."
az postgres flexible-server stop --resource-group "$RG" --name "$PG_SERVER" --output none 2>/dev/null || \
  echo "(postgres stop failed — server may already be stopped or name differs)"

echo "Staging compute stopped. Static Web App has no compute charge on Free tier."
echo "Small storage charges on Postgres may still apply."
echo "Start again: ./deploy/scripts/start-staging-india.sh"
