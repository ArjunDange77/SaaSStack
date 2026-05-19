#!/usr/bin/env bash
# Provision School Bus staging: shared VNet (if needed) + rg-saasstack-sb-staging product stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

SB_RG="${AZURE_SB_RESOURCE_GROUP:-rg-saasstack-sb-staging}"
LOCATION="${AZURE_LOCATION:-centralindia}"
APP_LOCATION="${AZURE_APP_LOCATION:-southindia}"
SHARED_ENV="$ROOT/deploy/.secrets/shared-network.env"
SECRETS_DIR="$ROOT/deploy/.secrets"
SECRETS_FILE="$SECRETS_DIR/schoolbus-staging.secrets.env"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required."
  exit 1
fi

if [[ ! -f "$SHARED_ENV" ]]; then
  echo "Shared network not found. Running provision-shared-network.sh..."
  bash "$ROOT/deploy/scripts/provision-shared-network.sh"
fi
# shellcheck disable=SC1090
source "$SHARED_ENV"

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

if [[ ! -f "$SECRETS_FILE" ]]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)Aa1"
  DJANGO_SECRET_KEY="$(openssl rand -base64 48)"
  cat >"$SECRETS_FILE" <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) — NEVER commit
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
EOF
  chmod 600 "$SECRETS_FILE"
  echo "Wrote new secrets to $SECRETS_FILE"
else
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"

echo "Creating School Bus resource group $SB_RG..."
az group create --name "$SB_RG" --location "$LOCATION" --tags env=staging product=schoolbus region=india

DEPLOYMENT_NAME="saasstack-sb-staging-$(date +%Y%m%d%H%M%S)"
echo "Deploying School Bus stack (Postgres: $LOCATION, Apps: $APP_LOCATION)..."
az deployment group create \
  --resource-group "$SB_RG" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$ROOT/deploy/azure/schoolbus.bicep" \
  --parameters \
    environmentName=staging \
    location="$LOCATION" \
    appServiceLocation="$APP_LOCATION" \
    integrationSubnetId="$INTEGRATION_SUBNET_ID" \
    privateEndpointSubnetId="$PRIVATE_ENDPOINT_SUBNET_ID" \
    postgresPrivateDnsZoneId="$POSTGRES_PRIVATE_DNS_ZONE_ID" \
    postgresPassword="$POSTGRES_PASSWORD" \
    djangoSecretKey="$DJANGO_SECRET_KEY" \
  --output none

API_APP="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.apiAppName.value -o tsv)"
FE_APP="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.frontendAppName.value -o tsv)"
API_URL="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.apiUrl.value -o tsv)"
FE_URL="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.frontendUrl.value -o tsv)"
PG_HOST="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresHost.value -o tsv)"
PG_DB="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresDb.value -o tsv)"
PG_USER="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.postgresUser.value -o tsv)"
KV_NAME="$(az deployment group show --resource-group "$SB_RG" --name "$DEPLOYMENT_NAME" --query properties.outputs.keyVaultName.value -o tsv)"

if [[ -n "$KV_NAME" ]]; then
  echo "Seeding Key Vault secrets in $KV_NAME..."
  az keyvault secret set --vault-name "$KV_NAME" --name django-secret-key --value "$DJANGO_SECRET_KEY" --output none
  az keyvault secret set --vault-name "$KV_NAME" --name postgres-password --value "$POSTGRES_PASSWORD" --output none
fi

GITHUB_FILE="$SECRETS_DIR/github-schoolbus-staging-secrets.env"
{
  echo "# School Bus staging — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "AZURE_RESOURCE_GROUP=$SB_RG"
  echo "AZURE_WEBAPP_NAME=$API_APP"
  echo "AZURE_WEBAPP_NAME_FRONTEND=$FE_APP"
  echo "STAGING_API_URL=$API_URL"
  echo "VITE_API_BASE=$API_URL"
  echo "SMOKE_WEB_URL=$FE_URL"
  echo "POSTGRES_DB=$PG_DB"
  echo "POSTGRES_USER=$PG_USER"
  echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
  echo "DB_HOST=$PG_HOST"
  echo "DB_PORT=5432"
  echo "DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY"
} >"$GITHUB_FILE"

echo ""
echo "School Bus staging provisioned."
echo "  API:      $API_URL"
echo "  Frontend: $FE_URL"
echo "  Secrets:  $GITHUB_FILE"
echo ""
echo "Next: GITHUB_ENVIRONMENT=schoolbus-staging AZURE_RESOURCE_GROUP=$SB_RG bash deploy/scripts/setup-github-oidc.sh"
echo "      bash deploy/scripts/sync-github-schoolbus-staging-secrets.sh"
