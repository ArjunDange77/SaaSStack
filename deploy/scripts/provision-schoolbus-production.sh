#!/usr/bin/env bash
# Provision School Bus production (rg-saasstack-sb-prod). Requires shared network.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/load-local-secrets.sh
source "$ROOT/deploy/scripts/lib/load-local-secrets.sh"
load_local_secrets || true

SB_RG="${AZURE_SB_PROD_RESOURCE_GROUP:-rg-saasstack-sb-prod}"
LOCATION="${AZURE_LOCATION:-centralindia}"
APP_LOCATION="${AZURE_APP_LOCATION:-southindia}"
SHARED_ENV="$ROOT/deploy/.secrets/shared-network.env"
SECRETS_FILE="$ROOT/deploy/.secrets/schoolbus-production.secrets.env"

if [[ ! -f "$SHARED_ENV" ]]; then
  bash "$ROOT/deploy/scripts/provision-shared-network.sh"
fi
# shellcheck disable=SC1090
source "$SHARED_ENV"

mkdir -p "$ROOT/deploy/.secrets"
if [[ ! -f "$SECRETS_FILE" ]]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)Aa1"
  DJANGO_SECRET_KEY="$(openssl rand -base64 48)"
  cat >"$SECRETS_FILE" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
EOF
  chmod 600 "$SECRETS_FILE"
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"

az group create --name "$SB_RG" --location "$LOCATION" --tags env=production product=schoolbus

DEPLOYMENT_NAME="saasstack-sb-prod-$(date +%Y%m%d%H%M%S)"
az deployment group create \
  --resource-group "$SB_RG" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$ROOT/deploy/azure/schoolbus.bicep" \
  --parameters \
    environmentName=prod \
    location="$LOCATION" \
    appServiceLocation="$APP_LOCATION" \
    integrationSubnetId="$INTEGRATION_SUBNET_ID" \
    privateEndpointSubnetId="$PRIVATE_ENDPOINT_SUBNET_ID" \
    postgresPrivateDnsZoneId="$POSTGRES_PRIVATE_DNS_ZONE_ID" \
    postgresPassword="$POSTGRES_PASSWORD" \
    djangoSecretKey="$DJANGO_SECRET_KEY" \
    postgresHighAvailability=true \
    postgresBackupRetentionDays=35

echo "School Bus production stack deployed to $SB_RG"
echo "Next: GITHUB_ENVIRONMENT=schoolbus-production AZURE_RESOURCE_GROUP=$SB_RG bash deploy/scripts/setup-github-oidc.sh"
