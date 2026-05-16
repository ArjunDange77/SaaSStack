#!/usr/bin/env bash
# Start staging compute before demos or deploy smoke tests.
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
API_APP="${AZURE_WEBAPP_NAME:-saasstack-staging-api}"
PG_SERVER="${POSTGRES_SERVER_NAME:-saasstack-staging-pg}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI required."
  exit 1
fi

echo "Starting PostgreSQL: $PG_SERVER ..."
az postgres flexible-server start --resource-group "$RG" --name "$PG_SERVER" --output none 2>/dev/null || true

echo "Starting App Service: $API_APP ..."
az webapp start --resource-group "$RG" --name "$API_APP" --output none 2>/dev/null || true

echo "Staging compute started. Wait ~2–3 minutes before health checks."
