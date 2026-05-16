#!/usr/bin/env bash
# One-off: create django_cache on staging when public booking returns 500.
# Requires: az login, access to rg-saasstack-staging
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
APP="${AZURE_WEBAPP_NAME:-saasstack-staging-api}"

echo "Running createcachetable on ${APP}..."
az webapp ssh \
  --resource-group "$RG" \
  --name "$APP" \
  --command "cd /app/backend && python manage.py createcachetable"

echo "Verify public booking:"
API_URL="${STAGING_API_URL:-https://saasstack-staging-api.azurewebsites.net}"
curl -sf "${API_URL}/api/pg/public/pg-demo/rooms/available/" | head -c 200
echo ""
echo "Done."
