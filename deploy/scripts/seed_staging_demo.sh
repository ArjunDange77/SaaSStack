#!/usr/bin/env bash
# Re-seed pg-demo on staging (workflow_dispatch only — restarts App Service).
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
APP="${AZURE_WEBAPP_NAME:?AZURE_WEBAPP_NAME required}"
API_URL="${STAGING_API_URL:?STAGING_API_URL required}"

echo "Enabling SEED_STAGING_DEMO and restarting ${APP}..."
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_STAGING_DEMO=true \
  --output none
az webapp restart --resource-group "$RG" --name "$APP" --output none

SEEDED=0
for i in $(seq 1 36); do
  if curl -sf "${API_URL}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}' | grep -q access; then
    echo "Seed verified: admin login OK"
    SEEDED=1
    break
  fi
  echo "Waiting for seed (attempt ${i}/36)..."
  sleep 10
done

if [ "$SEEDED" != 1 ]; then
  echo "Seed failed: admin login not available after restart"
  exit 1
fi

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings SEED_STAGING_DEMO=false \
  --output none
echo "SEED_STAGING_DEMO disabled."
