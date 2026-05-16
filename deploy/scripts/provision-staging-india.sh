#!/usr/bin/env bash
# Provision low-cost SaaSStack staging in India (centralindia by default).
# Prerequisites: az login, subscription selected, Bicep CLI (via az bicep).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

RG="${AZURE_RESOURCE_GROUP:-rg-saasstack-staging}"
LOCATION="${AZURE_LOCATION:-centralindia}"
SECRETS_DIR="$ROOT/deploy/.secrets"
SECRETS_FILE="$SECRETS_DIR/staging.secrets.env"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required. Install: https://learn.microsoft.com/cli/azure/install-azure-cli"
  exit 1
fi

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

if [[ ! -f "$SECRETS_FILE" ]]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)Aa1"
  DJANGO_SECRET_KEY="$(openssl rand -base64 48)"
  cat >"$SECRETS_FILE" <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) — NEVER commit this file
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
EOF
  chmod 600 "$SECRETS_FILE"
  echo "Wrote new secrets to $SECRETS_FILE"
else
  echo "Using existing secrets from $SECRETS_FILE"
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"

echo "Creating resource group $RG in $LOCATION..."
az group create --name "$RG" --location "$LOCATION" --tags env=staging purpose=market-validation region=india

echo "Deploying Bicep (minimal cost: no App Insights, no Key Vault, no Blob)..."
DEPLOYMENT_NAME="saasstack-staging-$(date +%Y%m%d%H%M%S)"
az deployment group create \
  --resource-group "$RG" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$ROOT/deploy/azure/main.bicep" \
  --parameters \
    environmentName=staging \
    location="$LOCATION" \
    enableMonitoring=false \
    enableKeyVault=false \
    useAzureStorage=false \
    postgresPassword="$POSTGRES_PASSWORD" \
    djangoSecretKey="$DJANGO_SECRET_KEY" \
  --output none

API_APP="$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.apiAppName.value -o tsv)"
API_URL="$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.apiUrl.value -o tsv)"
SWA_NAME="$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.staticWebAppName.value -o tsv)"
PG_HOST="$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresHost.value -o tsv)"
PG_DB="$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresDb.value -o tsv)"
PG_USER="$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresUser.value -o tsv)"

# SWA default hostname may differ from template guess — fetch actual host
SWA_DEFAULT="$(az staticwebapp show --name "$SWA_NAME" --resource-group "$RG" --query defaultHostname -o tsv)"
SWA_URL="https://${SWA_DEFAULT}"
CORS_ORIGIN="$SWA_URL"

echo "Updating CORS to SWA URL: $CORS_ORIGIN"
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$API_APP" \
  --settings "CORS_ALLOWED_ORIGINS=$CORS_ORIGIN" \
  --output none

SWA_TOKEN="$(az staticwebapp secrets list --name "$SWA_NAME" --resource-group "$RG" --query properties.apiKey -o tsv)"

cat >>"$SECRETS_FILE" <<EOF

# Provisioned resources
AZURE_RESOURCE_GROUP=$RG
AZURE_LOCATION=$LOCATION
AZURE_WEBAPP_NAME=$API_APP
STAGING_API_URL=$API_URL
VITE_API_BASE=$API_URL
STATIC_WEB_APP_NAME=$SWA_NAME
SWA_URL=$SWA_URL
AZURE_STATIC_WEB_APPS_API_TOKEN=$SWA_TOKEN
POSTGRES_DB=$PG_DB
POSTGRES_USER=$PG_USER
DB_HOST=$PG_HOST
DB_PORT=5432
EOF

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"

cat >"$SECRETS_DIR/github-staging-secrets.env" <<EOF
# Copy these into GitHub → Settings → Environments → staging → Secrets
AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
AZURE_TENANT_ID=$TENANT_ID
# AZURE_CLIENT_ID=  # from setup-github-oidc.sh
AZURE_WEBAPP_NAME=$API_APP
STAGING_API_URL=$API_URL
VITE_API_BASE=$API_URL
AZURE_STATIC_WEB_APPS_API_TOKEN=$SWA_TOKEN
POSTGRES_DB=$PG_DB
POSTGRES_USER=$PG_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DB_HOST=$PG_HOST
DB_PORT=5432
SMOKE_USERNAME=admin
SMOKE_PASSWORD=admin
EOF
chmod 600 "$SECRETS_DIR/github-staging-secrets.env"

echo ""
echo "=== Staging provisioned ==="
echo "API:      $API_URL"
echo "Frontend: $SWA_URL"
echo "Postgres: $PG_HOST (db: $PG_DB)"
echo ""
echo "Next steps:"
echo "  1. Run: deploy/scripts/setup-github-oidc.sh"
echo "  2. Copy secrets from: deploy/.secrets/github-staging-secrets.env → GitHub staging environment"
echo "  3. Push to branch 'staging' to trigger deploy"
echo "  4. After deploy: deploy/scripts/seed-staging-azure.sh"
echo ""
echo "Save money: az webapp stop --name $API_APP --resource-group $RG  (when not demoing)"

"$ROOT/deploy/scripts/write-pilot-urls-local.sh" || true
